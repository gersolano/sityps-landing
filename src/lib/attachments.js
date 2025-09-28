// src/lib/attachments.js
// Convierte File[] del navegador a adjuntos base64 para nuestras Functions (mailer)
export async function filesToAttachments(files) {
  const arr = [];
  for (const f of Array.from(files || [])) {
    const base64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        resolve(s.includes(",") ? s.split(",")[1] : s);
      };
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    arr.push({
      filename: f.name,
      name: f.name,
      contentType: f.type || "application/octet-stream",
      base64,
      size: f.size,
    });
  }
  return arr;
}
