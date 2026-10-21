from fastapi.testclient import TestClient

from app.main import create_app


def test_frontend_and_api_share_one_origin(tmp_path):
    (tmp_path / 'index.html').write_text('<title>FutureProof</title>', encoding='utf-8')
    (tmp_path / 'app.js').write_text('window.ready=true', encoding='utf-8')
    client=TestClient(create_app(site_dir=tmp_path))
    assert client.get('/').status_code==200
    assert client.get('/individual/roadmap/draft').text=='<title>FutureProof</title>'
    assert client.get('/app.js').text=='window.ready=true'
    assert client.get('/api/v1/health').json()['data']['status']=='ok'
    assert client.get('/api/v1/unknown').status_code==404
    assert client.get('/missing.js').status_code==404
