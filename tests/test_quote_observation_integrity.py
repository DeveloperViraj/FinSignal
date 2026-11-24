"""A new HTTP/cache read does not make a daily close a live quote."""
from unittest.mock import patch

from fastapi.testclient import TestClient
import api.index as api
from src.providers.schemas import OHLCVBar, PriceSeries, ProviderResult


def test_batch_quote_keeps_the_actual_market_date_and_daily_basis():
    bars = [OHLCVBar(date=f'2026-01-{i:02d}', close=100.0+i, volume=0) for i in range(1, 7)]
    result = ProviderResult(data=PriceSeries(symbol='AAPL', bars=bars), source='vendor', cached=True)
    with patch.object(api.providers.market_data, 'get_series', return_value=result):
        quote = TestClient(api.app).get('/api/quotes?symbols=AAPL').json()['quotes']['AAPL']
    assert quote['as_of'] == '2026-01-06'
    assert quote['price_basis'] == 'daily close'
    assert quote['source'] == 'vendor'


def test_one_failed_symbol_does_not_erase_the_other_quote():
    good = ProviderResult(data=PriceSeries(symbol='MSFT', bars=[
        OHLCVBar(date=f'2026-01-{i:02d}', close=400.0+i) for i in range(1, 7)
    ]), source='vendor')
    def fetch(symbol, period):
        return ProviderResult(error='vendor unavailable') if symbol == 'AAPL' else good
    with patch.object(api.providers.market_data, 'get_series', side_effect=fetch):
        body = TestClient(api.app).get('/api/quotes?symbols=AAPL,MSFT').json()
    assert body['quotes']['AAPL']['error']
    assert body['quotes']['MSFT']['price'] == 406.0
    assert body['count'] == 2


def test_batch_quote_carries_the_closes_it_was_computed_from():
    """Sparklines draw from the quote batch instead of one chart call per row."""
    bars = [OHLCVBar(date=f'2026-01-{i:02d}', close=100.004 + i, volume=0) for i in range(1, 8)]
    result = ProviderResult(data=PriceSeries(symbol='AAPL', bars=bars), source='vendor')
    with patch.object(api.providers.market_data, 'get_series', return_value=result) as series:
        quote = TestClient(api.app).get('/api/quotes?symbols=AAPL').json()['quotes']['AAPL']
    assert series.call_count == 1
    assert quote['closes'] == [101.0, 102.0, 103.0, 104.0, 105.0, 106.0, 107.0]
    assert quote['closes'][-1] == quote['price']


# ── a live last sale stands over the daily history ──────────────────────────

from src.providers.schemas import PriceQuote   # noqa: E402

_SESSIONS = ['2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
_CLOSES = [173.73, 166.19, 162.85, 156.14, 150.96, 125.53]


def _history():
    bars = [OHLCVBar(date=d, close=c) for d, c in zip(_SESSIONS, _CLOSES)]
    return ProviderResult(data=PriceSeries(symbol='NVDA', bars=bars), source='polygon')


def _quotes_with(live):
    with patch.object(api.providers.market_data, 'get_series', return_value=_history()), \
         patch.object(api.providers.market_data, 'get_live_price', return_value=live):
        return TestClient(api.app).get('/api/quotes?symbols=NVDA').json()['quotes']['NVDA']


def test_a_live_trade_on_the_next_session_is_the_price_not_fridays_close():
    """The morning NVDA traded at $169 and the product said $125.53."""
    live = ProviderResult(data=PriceQuote(
        symbol='NVDA', price=169.2, previous_close=125.53,
        as_of='2026-11-23T15:33:02+00:00', price_basis='last sale',
    ), source='finnhub')
    quote = _quotes_with(live)
    assert quote['price'] == 169.2
    assert quote['price_basis'] == 'last sale' and quote['source'] == 'finnhub'
    assert quote['session'] == '2026-11-23'
    assert quote['history_as_of'] == '2026-11-20' and quote['history_source'] == 'polygon'
    assert quote['change_1d'] == round((169.2 / 125.53 - 1) * 100, 2)
    # A week is five sessions back from today's: the 16th, not the 13th.
    assert quote['change_1w'] == round((169.2 / 166.19 - 1) * 100, 2)
    assert quote['closes'][-1] == 169.2 and quote['closes'][-2] == 125.53


def test_a_close_answered_as_a_quote_leaves_the_history_alone():
    for live in (
        ProviderResult(data=None, error='no live vendor configured'),
        ProviderResult(data=PriceQuote(symbol='NVDA', price=150.0, as_of='2026-11-19T20:00:00+00:00',
                                       price_basis='last sale'), source='finnhub'),
        ProviderResult(data=PriceQuote(symbol='NVDA', price=169.2, as_of='2026-11-23T15:33:02+00:00',
                                       price_basis='last sale'), source='finnhub', stale=True),
    ):
        quote = _quotes_with(live)
        assert quote['price'] == 125.53 and quote['price_basis'] == 'daily close', live
        assert quote['as_of'] == '2026-11-20' and 'session' not in quote


def test_a_live_price_on_another_basis_is_never_divided_by_the_history():
    """A previous close 10x the history's is a split one side has not applied."""
    live = ProviderResult(data=PriceQuote(
        symbol='NVDA', price=16.92, previous_close=12.553,
        as_of='2026-11-23T15:33:02+00:00', price_basis='last sale',
    ), source='finnhub')
    quote = _quotes_with(live)
    assert quote['price'] == 16.92
    assert quote['change_1d'] == round((16.92 / 12.553 - 1) * 100, 2), 'measured on the vendor\'s own close'
    assert quote['change_1w'] is None
    assert quote['closes'][-1] == 125.53, 'the sparkline does not splice two bases together'


def test_the_price_chain_asks_live_vendors_before_any_close():
    family = api.providers.market_data
    live = [link.vendor.NAME for link in family._live_links('NVDA')]
    assert live == ['tiingo', 'finnhub', 'twelvedata', 'fmp']
    assert not {'massive', 'polygon', 'marketstack', 'yfinance'} & set(live)
