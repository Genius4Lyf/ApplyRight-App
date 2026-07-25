import { describe, it, expect, vi, beforeEach } from 'vitest';

// The download calls use responseType:'blob', so error bodies arrive as Blobs too.
// These tests pin the decoding: the server's real message must reach the caller
// instead of an opaque Blob (which stringifies to "[object Blob]").
vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

const api = (await import('./api')).default;
const CVService = (await import('./cv.service')).default;

// An axios-shaped error whose JSON body was delivered as a Blob.
const blobError = (status, body) => {
  const e = new Error('Request failed with status code ' + status);
  e.response = {
    status,
    data: new Blob([typeof body === 'string' ? body : JSON.stringify(body)]),
  };
  return e;
};

describe('CVService download error decoding', () => {
  beforeEach(() => vi.clearAllMocks());

  for (const [name, call] of [
    ['generateDocx', () => CVService.generateDocx({ markdown: '#' }, {})],
    ['generatePdf', () => CVService.generatePdf('<html></html>', {}, {})],
  ]) {
    describe(name, () => {
      it('surfaces the server message on a 500 instead of an opaque Blob', async () => {
        api.post.mockRejectedValue(
          blobError(500, {
            message: 'Failed to generate DOCX',
            error: 'Cannot read properties of undefined (reading "children")',
          })
        );
        await expect(call()).rejects.toThrow('Failed to generate DOCX');
        // The regression being guarded: `${err}` used to read "[object Blob]".
        const err = await call().catch((e) => e);
        expect(String(err)).not.toContain('[object Blob]');
        expect(err.status).toBe(500);
      });

      it('surfaces a 400 validation message', async () => {
        api.post.mockRejectedValue(blobError(400, { message: 'CV markdown content is required' }));
        await expect(call()).rejects.toThrow('CV markdown content is required');
      });

      it('keeps the 402 NEED_DOWNLOAD contract', async () => {
        api.post.mockRejectedValue(
          blobError(402, { message: 'Pay ₦500 to download', code: 'NEED_DOWNLOAD' })
        );
        const err = await call().catch((e) => e);
        expect(err.code).toBe('NEED_DOWNLOAD');
        expect(err.message).toBe('Pay ₦500 to download');
      });

      it('falls back to NEED_DOWNLOAD when a 402 body is not JSON', async () => {
        api.post.mockRejectedValue(blobError(402, 'gateway timeout'));
        const err = await call().catch((e) => e);
        expect(err.code).toBe('NEED_DOWNLOAD');
      });

      it('uses the raw body when a non-JSON error blob comes back', async () => {
        api.post.mockRejectedValue(blobError(502, 'upstream connect error'));
        await expect(call()).rejects.toThrow('upstream connect error');
      });

      it('rethrows the original error when there is no decodable body', async () => {
        const network = new Error('Network Error'); // no .response at all
        api.post.mockRejectedValue(network);
        await expect(call()).rejects.toBe(network);
      });

      it('resolves with the blob on success', async () => {
        const blob = new Blob(['file']);
        api.post.mockResolvedValue({ data: blob });
        await expect(call()).resolves.toBe(blob);
      });
    });
  }
});
