import { isMobile } from './platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Download a Blob as a file. Web uses an anchor click; Capacitor writes to the
 * device cache and opens the system share sheet so the user can save, open in
 * a viewer, or send the file via any installed app.
 */
export async function downloadBlob(blob, filename) {
  if (isMobile()) {
    return downloadMobile(blob, filename);
  }
  return downloadWeb(blob, filename);
}

function downloadWeb(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

async function downloadMobile(blob, filename) {
  const base64 = await blobToBase64(blob);

  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: 'Save or share your file',
    });
  } catch (err) {
    // User dismissing the share sheet shouldn't surface as an error.
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss')) return;
    throw err;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' && result.includes(',')
        ? result.split(',')[1]
        : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
