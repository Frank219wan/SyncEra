import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import fitz
from docx import Document
from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import ProfileStore

CONSTRAINTS={'weekly_hours':5,'budget_amount':100,'currency':'MYR','language':'en','target_weeks':12,'learning_pace':'focused'}


def client(tmp_path):
    return TestClient(create_app(store=ProfileStore(str(tmp_path/'profiles.sqlite'))))


def pdf_bytes(text):
    doc=fitz.open()
    page=doc.new_page()
    page.insert_text((72,72),text)
    data=doc.tobytes()
    doc.close()
    return data


def docx_bytes(text):
    doc=Document()
    doc.add_paragraph(text)
    out=BytesIO()
    doc.save(out)
    return out.getvalue()


def upload(c,data,name='demo.pdf',**fields):
    form={'synthetic_input':'true','study_constraints':json.dumps(CONSTRAINTS),**fields}
    return c.post('/api/v1/profiles/upload',data=form,files={'file':(name,data)})


def test_real_pdf_and_docx_http_upload_confirmation(tmp_path):
    c=client(tmp_path)
    a=upload(c,pdf_bytes('Synthetic Demo Resume. SQL analytics.'),'a.pdf')
    b=upload(c,docx_bytes('Synthetic Demo Resume. Python modelling.'),'b.docx')
    assert a.status_code==b.status_code==200,(a.text,b.text)
    pa,pb=a.json()['data']['profile'],b.json()['data']['profile']
    assert pa['profile_id']!=pb['profile_id']
    assert {x['skill_id'] for x in pa['skills']}=={'skill_sql'}
    assert {x['skill_id'] for x in pb['skills']}=={'skill_python'}
    assert all(x['level'] is None and x['source']=='inferred' for x in pa['skills']+pb['skills'])
    assert pa['reviewed_by_user'] is pb['reviewed_by_user'] is False
    assert a.json()['meta']['is_mock'] is b.json()['meta']['is_mock'] is True
    blocked=c.post('/api/v1/recommendations',json={'profile_id':pa['profile_id'],'ai_scenario':'moderate'})
    assert blocked.status_code==422 and blocked.json()['error']['code']=='PROFILE_NOT_CONFIRMED'
    confirmed=c.post('/api/v1/profiles/confirm',json={'profile_id':pa['profile_id'],'skills':[{'skill_id':'skill_sql','level':3,'source':'confirmed','confidence':1}], 'reviewed_by_user':True,'profile_revision':pa['revision']})
    assert confirmed.status_code==200 and confirmed.json()['data']['profile_revision']==2
    rec=c.post('/api/v1/recommendations',json={'profile_id':pa['profile_id'],'ai_scenario':'moderate'})
    assert rec.status_code==200 and rec.json()['data']['recommendations']
    assert 'Synthetic Demo Resume' not in (tmp_path/'profiles.sqlite').read_bytes().decode('utf-8',errors='ignore')


def test_file_rejections(tmp_path):
    c=client(tmp_path)
    cases=[
        (b'hello','demo.txt',415,'CV_UNSUPPORTED_TYPE'),
        (b'hello','demo.pdf',422,'CV_INVALID_FILE'),
        (b'%PDF-damaged','demo.pdf',422,'CV_INVALID_FILE'),
        (b'PK\x03\x04damaged','demo.docx',422,'CV_INVALID_FILE'),
        (b'','demo.pdf',422,'CV_INVALID_FILE'),
    ]
    for data,name,status,code in cases:
        r=upload(c,data,name)
        assert (r.status_code,r.json()['error']['code'])==(status,code)
    r=upload(c,pdf_bytes('Synthetic SQL'), 'fake.docx')
    assert r.status_code==422
    r=upload(c,pdf_bytes('Synthetic SQL'), 'fake.pdf',synthetic_input='false')
    assert r.status_code==422 and r.json()['error']['code']=='SYNTHETIC_ONLY'
    r=upload(c,pdf_bytes('Synthetic SQL'), 'a.pdf',study_constraints='{}')
    assert r.status_code==422 and r.json()['error']['code']=='VALIDATION_ERROR'


def test_size_scan_and_zip_bomb_limits(tmp_path,monkeypatch):
    c=client(tmp_path)
    monkeypatch.setenv('MAX_CV_UPLOAD_BYTES','100')
    r=upload(c,pdf_bytes('Synthetic SQL'),'a.pdf')
    assert r.status_code==413 and r.json()['error']['code']=='CV_TOO_LARGE'
    monkeypatch.delenv('MAX_CV_UPLOAD_BYTES')
    blank=fitz.open();blank.new_page();data=blank.tobytes();blank.close()
    r=upload(c,data,'scan.pdf')
    assert r.status_code==422 and r.json()['error']['code']=='CV_NO_TEXT'
    out=BytesIO()
    with ZipFile(out,'w',ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml','<Types/>')
        z.writestr('word/document.xml','x'*11_000_000)
    r=upload(c,out.getvalue(),'bomb.docx')
    assert r.status_code==422 and r.json()['error']['code']=='CV_TOO_COMPLEX'


def test_upload_openapi_and_cors(tmp_path):
    c=client(tmp_path)
    spec=c.get('/openapi.json').json()['paths']['/api/v1/profiles/upload']['post']
    assert 'multipart/form-data' in spec['requestBody']['content']
    assert {'413','415','422'} <= set(spec['responses'])
    r=c.options('/api/v1/profiles/upload',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST'})
    assert r.status_code==200 and r.headers['access-control-allow-origin']=='http://localhost:5173'
