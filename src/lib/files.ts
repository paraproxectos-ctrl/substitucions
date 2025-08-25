import { supabase, BUCKET } from './supabaseClient';

// Subida: devuelve el path y la fecha de caducidad (5 días)
export async function uploadFile(file: File) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = crypto.randomUUID();
  const path = `${day}/${key}/${file.name}`; // <-- GUARDA ESTE path

  const { error: upErr } = await supabase
    .storage.from(BUCKET)
    .upload(path, file, { upsert: true });

  if (upErr) throw upErr;

  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  // Si tienes tabla para listar/limpiar, guarda el path y expiresAt:
  // await supabase.from('files').upsert({ path, expires_at: expiresAt });

  return { path, expiresAt };
}

// Borrado: elimina de STORAGE (y opcionalmente de tu tabla)
export async function deleteFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;

  // Si usas tabla:
  // await supabase.from('files').delete().eq('path', path);
}
