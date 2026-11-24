"""A backend on the open internet answers only the website that holds its key.

A free host (a Hugging Face Space) has no IAM in front of it, and research is
callable without signing in, so anyone with the address could spend the
deployment's free provider quotas. `BACKEND_SHARED_KEY` closes it.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

import api.index as api
from src.providers.schemas import OHLCVBar, PriceSeries, ProviderResult


def _client():
    return TestClient(api.app, raise_server_exceptions=False)


def _series():
    bars = [OHLCVBar(date=f'2026-01-{i:02d}', close=100.0 + i) for i in range(1, 8)]
    return ProviderResult(data=PriceSeries(symbol='AAPL', bars=bars), source='fixture')


def test_without_a_key_configured_nothing_changes(monkeypatch):
    monkeypatch.delenv('BACKEND_SHARED_KEY', raising=False)
    with patch.object(api.providers.market_data, 'get_series', return_value=_series()):
        assert _client().get('/api/quotes?symbols=AAPL').status_code == 200


def test_with_a_key_every_route_refuses_a_caller_without_it(monkeypatch):
    monkeypatch.setenv('BACKEND_SHARED_KEY', 'k-0123456789abcdef')
    client = _client()
    with patch.object(api.providers.market_data, 'get_series', return_value=_series()) as series:
        for headers in ({}, {'X-Backend-Key': 'wrong'}, {'X-Backend-Key': ''}):
            response = client.get('/api/quotes?symbols=AAPL', headers=headers)
            assert response.status_code == 401, headers
            assert 'k-0123456789abcdef' not in response.text
        assert series.call_count == 0, 'a refused request did no work'
        assert client.post('/api/internal/alerts/evaluate').status_code == 401


def test_the_website_key_opens_every_route(monkeypatch):
    monkeypatch.setenv('BACKEND_SHARED_KEY', 'k-0123456789abcdef')
    with patch.object(api.providers.market_data, 'get_series', return_value=_series()):
        response = _client().get('/api/quotes?symbols=AAPL', headers={'X-Backend-Key': 'k-0123456789abcdef'})
    assert response.status_code == 200
    assert response.json()['quotes']['AAPL']['price'] == 107.0


def test_liveness_stays_open_for_uptime_checks(monkeypatch):
    monkeypatch.setenv('BACKEND_SHARED_KEY', 'k-0123456789abcdef')
    response = _client().get('/api/health')
    assert response.status_code == 200
    assert 'k-0123456789abcdef' not in response.text
