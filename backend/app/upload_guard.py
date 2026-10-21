"""Limit the complete upload request before Starlette parses multipart parts."""
from __future__ import annotations

import json

from .cv_upload import upload_limit

MAX_MULTIPART_OVERHEAD_BYTES = 256 * 1024


class _BodyTooLarge(Exception):
    pass


class UploadBodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (scope['type'] != 'http' or scope.get('method') != 'POST'
            or scope.get('path') != '/api/v1/profiles/upload'):
            await self.app(scope, receive, send)
            return

        limit = upload_limit() + MAX_MULTIPART_OVERHEAD_BYTES
        lengths = [value for name, value in scope.get('headers', []) if name.lower() == b'content-length']

        async def reject(status: int, code: str, message: str):
            request_id = scope.get('state', {}).get('request_id', 'req_upload_rejected')
            body = json.dumps({
                'error': {'code': code, 'message': message, 'details': [], 'retryable': False},
                'meta': {'request_id': request_id},
            }).encode('utf-8')
            await send({'type': 'http.response.start', 'status': status,
                        'headers': [(b'content-type', b'application/json'),
                                    (b'content-length', str(len(body)).encode('ascii'))]})
            await send({'type': 'http.response.body', 'body': body})

        if len(lengths) > 1 or (lengths and (not lengths[0].isdigit())):
            await reject(400, 'BAD_REQUEST', 'Invalid Content-Length')
            return
        if lengths and int(lengths[0]) > limit:
            await reject(413, 'CV_REQUEST_TOO_LARGE', 'Upload request exceeds the total size limit')
            return

        seen = 0
        response_started = False

        async def bounded_receive():
            nonlocal seen
            message = await receive()
            if message['type'] == 'http.request':
                seen += len(message.get('body', b''))
                if seen > limit:
                    raise _BodyTooLarge
            return message

        async def tracked_send(message):
            nonlocal response_started
            if message['type'] == 'http.response.start':
                response_started = True
            await send(message)

        try:
            await self.app(scope, bounded_receive, tracked_send)
        except _BodyTooLarge:
            if response_started:
                raise
            await reject(413, 'CV_REQUEST_TOO_LARGE', 'Upload request exceeds the total size limit')
