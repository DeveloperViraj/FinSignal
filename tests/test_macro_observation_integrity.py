"""Invalid, stale or misdated macro observations cannot become a regime."""
from datetime import datetime, timezone
from unittest.mock import patch

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import api.index as api
from src.providers.schemas import MacroSnapshot, ProviderResult
from src.providers.validation import latest_monthly_yoy, monthly_yoy
from src.providers.vendors.data_vendors import FredVendor
from src.services import dashboard_service as dashboard


@pytest.fixture(autouse=True)
def no_cache():
    api._macro_cache.clear()
    api._stress_cache.clear()
    yield
    api._macro_cache.clear()
    api._stress_cache.clear()


@pytest.mark.parametrize('field', ['yield_spread', 'inflation_rate', 'fed_funds_rate'])
@pytest.mark.parametrize('bad', [float('nan'), float('inf'), float('-inf')])
def test_nonfinite_macro_values_stay_unavailable(field, bad):
    fields = dict(yield_spread=0.4, inflation_rate=2.0, fed_funds_rate=3.0)
    fields[field] = bad
    result = ProviderResult(data=MacroSnapshot(**fields), source='fred')
    with patch.object(api.providers.macro, 'get_macro', return_value=result):
        response = TestClient(api.app, raise_server_exceptions=False).get('/api/macro')
    assert response.status_code == 200
    body = response.json()
    assert body['stats'][field] is None
    if field != 'fed_funds_rate':
        assert body['risk_multiplier'] is None
        assert body['stats']['status'] == 'UNAVAILABLE'


def test_stale_snapshot_does_not_apply_a_live_gate():
    fetched = datetime(2020, 1, 1, tzinfo=timezone.utc)
    result = ProviderResult(data=MacroSnapshot(yield_spread=.4, inflation_rate=2, fed_funds_rate=3),
                            source='fred', stale=True, cached=True, fetched_at=fetched)
    with patch.object(api.providers.macro, 'get_macro', return_value=result):
        body = TestClient(api.app).get('/api/macro').json()
    assert body['risk_multiplier'] is None
    assert body['stats']['status'] == 'UNAVAILABLE'
    assert body['stats']['stale'] is True
    assert body['stats']['source'] == 'fred'
    assert body['stats']['fetched_at'].startswith('2020-01-01')


@pytest.mark.parametrize('fields', [dict(yield_spread=None, inflation_rate=2), dict(yield_spread=.5, inflation_rate=None)])
def test_dashboard_does_not_substitute_missing_macro_with_zero(fields):
    result = ProviderResult(data=MacroSnapshot(**fields), source='fred')
    with patch.object(dashboard, '_gather', return_value=[]), patch.object(dashboard.providers.macro, 'get_macro', return_value=result):
        regime = dashboard._macro_board()['regime']
    assert not regime['available']
    assert regime.get('risk_multiplier') is None


def test_stale_stress_observations_cannot_gate_the_verdict():
    result = ProviderResult(data=[('2020-01-01', 99.0)], source='fred', stale=True)
    with patch.object(api.providers.macro, 'get_series_snapshot', return_value=result), patch.object(api.providers.market_data, 'get_series', return_value=ProviderResult(data=None)):
        stress = api._stress_inputs()
    assert stress['term_spread'] is None
    assert stress['nfci'] is None


def _observations():
    # Missing June must not move February's comparison back to January.
    dates = pd.date_range('2024-01-01', periods=14, freq='MS').delete(5)
    return pd.Series([100., 102.] + [103.] * 10 + [110.], index=dates)


def test_fred_cpi_compares_the_same_month_one_year_earlier():
    vendor = FredVendor()
    class Fred:
        def get_series(self, series_id, **_params):  # fredapi forwards extra API parameters
            return _observations() if series_id == 'CPIAUCNS' else pd.Series([.4], index=pd.to_datetime(['2026-09-07']))
    with patch.object(FredVendor, 'available', True), patch.object(vendor, '_client', return_value=Fred()):
        snapshot = vendor.get_macro()
    assert snapshot.inflation_rate == 7.84
    assert snapshot.observation_dates['inflation_rate'] == '2025-02-01'
    assert snapshot.observation_dates['yield_spread'] == '2026-09-07'


# FRED's CPIAUCNS as published in November 2026: no October 2025 reading (the
# 2025 federal shutdown), so October 2026 has no year-over-year comparison.
_CPI_WITH_GAP = [
    ('2025-07-01', 323.048), ('2025-08-01', 323.976), ('2025-09-01', 324.8),
    ('2025-11-01', 324.122), ('2025-12-01', 324.054), ('2026-01-01', 325.252),
    ('2026-02-01', 326.785), ('2026-03-01', 330.213), ('2026-04-01', 333.02),
    ('2026-05-01', 335.123), ('2026-06-01', 333.952), ('2026-07-01', 333.918),
    ('2026-08-01', 334.98), ('2026-09-01', 336.94), ('2026-10-01', 337.511),
]
_SEPTEMBER_YOY = round((336.94 / 324.8 - 1) * 100, 2)   # 3.74
_AUGUST_YOY = round((334.98 / 323.976 - 1) * 100, 2)


def _cpi_series(observations):
    return pd.Series([v for _, v in observations], index=pd.to_datetime([d for d, _ in observations]))


def test_a_month_without_its_prior_year_falls_back_to_the_newest_comparable_month():
    assert monthly_yoy(_CPI_WITH_GAP) is None   # October 2026 has nothing to compare with
    assert latest_monthly_yoy(_CPI_WITH_GAP) == (_SEPTEMBER_YOY, '2026-09-01')


def test_the_newest_month_is_used_when_its_prior_year_exists():
    complete = _CPI_WITH_GAP[:3] + [('2025-10-01', 324.5)] + _CPI_WITH_GAP[3:]
    assert latest_monthly_yoy(complete) == (round((337.511 / 324.5 - 1) * 100, 2), '2026-10-01')


def test_the_fallback_stops_after_a_few_months_instead_of_reaching_back_a_year():
    # Only June 2026 has its prior year, four months back from October.
    june_only = [('2025-06-01', 322.561)] + _CPI_WITH_GAP[10:]
    assert latest_monthly_yoy(june_only) is None
    assert latest_monthly_yoy(june_only, max_back=4) == (round((333.952 / 322.561 - 1) * 100, 2), '2026-06-01')
    # Three back is inside the limit: July 2026 against July 2025.
    assert latest_monthly_yoy(_CPI_WITH_GAP[:1] + _CPI_WITH_GAP[11:]) == (
        round((333.918 / 323.048 - 1) * 100, 2), '2026-07-01')


def test_fred_cpi_across_the_gap_reports_september_and_dates_it_september():
    vendor = FredVendor()
    class Fred:
        def get_series(self, series_id, **_params):
            if series_id == 'CPIAUCNS':
                return _cpi_series(_CPI_WITH_GAP).sort_index(ascending=False)
            return pd.Series([.29], index=pd.to_datetime(['2026-11-23']))
    with patch.object(FredVendor, 'available', True), patch.object(vendor, '_client', return_value=Fred()):
        snapshot = vendor.get_macro()
    assert snapshot.inflation_rate == _SEPTEMBER_YOY
    # The freshness gate judges the month the figure describes, not the newest print.
    assert snapshot.observation_dates['inflation_rate'] == '2026-09-01'


def test_the_regime_is_computed_again_across_the_gap():
    snapshot = MacroSnapshot(yield_spread=.29, inflation_rate=_SEPTEMBER_YOY, fed_funds_rate=3.88,
                             observation_dates={'yield_spread': '2026-11-23', 'inflation_rate': '2026-09-01',
                                                'fed_funds_rate': '2026-10-01'})
    result = ProviderResult(data=snapshot, source='fred')
    with patch('src.services.macro_freshness.datetime') as clock, \
         patch.object(dashboard, '_gather', return_value=[]), \
         patch.object(dashboard.providers.macro, 'get_macro', return_value=result):
        clock.now.return_value = datetime(2026, 11, 24, tzinfo=timezone.utc)
        regime = dashboard._macro_board()['regime']
    assert regime['available'] and regime['risk_multiplier'] is not None


def test_dashboard_cpi_card_across_the_gap_shows_september_dated_september():
    with patch.object(dashboard.providers.macro, 'get_series_snapshot',
                      return_value=ProviderResult(data=_CPI_WITH_GAP, source='fred')):
        card = dashboard._macro_card({'id': 'CPIAUCSL', 'label': 'CPI', 'unit': 'index', 'yoy': 'true',
                                      'explain': 'year over year'})
    assert card['value'] == _SEPTEMBER_YOY
    assert card['previous'] == _AUGUST_YOY
    assert card['updated'] == '2026-09-01'


def test_the_command_line_risk_engine_compares_twelve_months_not_thirteen_rows():
    from src.risk_analysis import FinSignalRiskEngine

    engine = FinSignalRiskEngine(api_key='unused')
    engine._fred = type('Fred', (), {'get_series': lambda self, _id: _cpi_series(_CPI_WITH_GAP)})()
    # Thirteen rows back from October 2026 is September 2025: a 13-month change.
    assert engine._fetch_inflation_rate() == _SEPTEMBER_YOY


def test_dashboard_cpi_does_not_turn_a_short_history_into_an_index_reading():
    obs = [('2026-08-01', 320.)]
    with patch.object(dashboard.providers.macro, 'get_series_snapshot', return_value=ProviderResult(data=obs, source='fred')):
        card = dashboard._macro_card({'id':'CPIAUCSL','label':'CPI','unit':'index','yoy':'true','explain':'year over year'})
    assert card is None


def test_dashboard_cpi_uses_calendar_year_ago():
    obs = [(d.strftime('%Y-%m-%d'), v) for d,v in _observations().items()]
    with patch.object(dashboard.providers.macro, 'get_series_snapshot', return_value=ProviderResult(data=obs, source='fred')):
        card = dashboard._macro_card({'id':'CPIAUCSL','label':'CPI','unit':'index','yoy':'true','explain':'year over year'})
    assert card['value'] == 7.84
    assert card['unit'] == '% y/y'


def test_zero_spread_and_zero_inflation_are_real_measurements():
    result = ProviderResult(data=MacroSnapshot(yield_spread=0, inflation_rate=0, fed_funds_rate=0), source='fred')
    with patch.object(api.providers.macro, 'get_macro', return_value=result):
        multiplier, stats = api._fetch_macro_safe()
    assert multiplier == 1.0
    assert stats['yield_spread'] == 0
    assert stats['inflation_rate'] == '0.00%'
