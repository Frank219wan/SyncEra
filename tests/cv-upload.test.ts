import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_CV_FILE_BYTES, MAX_CV_REQUEST_BYTES, cvFileKind, validateSyntheticCvFile } from '../src/services/cv-upload.ts';

const file = (name: string, body: string | ArrayBuffer, type: string) => new File([body], name, { type });

test('client allows bounded fictional TXT and text-based PDF/DOCX candidates', async () => {
  assert.equal(cvFileKind('fictional.PDF'), 'pdf');
  assert.equal(await validateSyntheticCvFile(file('fictional.txt', 'Synthetic fictional CV', 'text/plain')), null);
  assert.equal(await validateSyntheticCvFile(file('fictional.pdf', '%PDF-synthetic', 'application/pdf')), null);
  assert.equal(await validateSyntheticCvFile(file('fictional.docx', 'PK\x03\x04synthetic', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')), null);
  assert.ok(MAX_CV_FILE_BYTES < MAX_CV_REQUEST_BYTES);
});

test('client rejects unsupported, binary text, mismatched signatures and large files', async () => {
  assert.equal(await validateSyntheticCvFile(file('real.exe', 'MZ', 'application/octet-stream')), 'unsupported');
  assert.equal(await validateSyntheticCvFile(file('empty.txt', '', 'text/plain')), 'empty');
  assert.equal(await validateSyntheticCvFile(file('binary.txt', 'abc\0def', 'text/plain')), 'invalid_content');
  assert.equal(await validateSyntheticCvFile(file('fake.pdf', 'not PDF', 'application/pdf')), 'invalid_content');
  assert.equal(await validateSyntheticCvFile(file('fake.pdf', '%PDF-synthetic', 'text/plain')), 'invalid_content');
  assert.equal(await validateSyntheticCvFile(file('large.pdf', new ArrayBuffer(MAX_CV_FILE_BYTES + 1), 'application/pdf')), 'too_large');
});
