"""Local, reviewer-controlled approved-data import. Never exposed over HTTP."""
import argparse
import json
import os
from pathlib import Path
from uuid import uuid4
from .approved_data import MarketRepository, ResourceRepository, ImportRejected

def _read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def _write_atomic(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+'.'+uuid4().hex+'.tmp')
    try:
        temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        os.replace(temp,path)
    finally:
        temp.unlink(missing_ok=True)

def main(argv=None):
    parser=argparse.ArgumentParser(description='Import reviewer-approved data; no public endpoint writes this store.')
    parser.add_argument('kind',choices=['snapshot','resources'])
    parser.add_argument('--package',required=True)
    parser.add_argument('--approvals',required=True)
    parser.add_argument('--output-dir',default=str(Path(__file__).resolve().parents[1]/'data'/'approved'))
    args=parser.parse_args(argv)
    root=Path(args.output_dir)
    package=_read(args.package); approvals=_read(args.approvals)
    if args.kind=='snapshot':
        repo=MarketRepository(active_snapshot_id=None)
        repo.load_dir(root)
        snap=repo.import_public(package,approvals)
        target=root/'snapshots'/f'{snap.snapshot_id}.json'
        if target.exists(): raise ImportRejected('snapshot file already exists')
        _write_atomic(target,package)
        _write_atomic(root/'approvals'/target.name,approvals)
        print(f'validated and stored snapshot {snap.snapshot_id}; activation requires ACTIVE_SNAPSHOT_ID')
    else:
        repo=ResourceRepository()
        repo.load_dir(root)
        repo.import_approved(package,approvals)
        if (root/'resources.json').exists():
            package=_read(root/'resources.json')+package
            approvals=_read(root/'resource_approvals.json')+approvals
        _write_atomic(root/'resources.json',package)
        _write_atomic(root/'resource_approvals.json',approvals)
        print('validated and stored reviewed resources')

if __name__=='__main__': main()
