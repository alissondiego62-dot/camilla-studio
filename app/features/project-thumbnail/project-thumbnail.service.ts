import { supabase } from "@/lib/supabase";
import type { ProjectThumbnail } from "@/app/features/project-detail/types";
import { PROJECT_THUMBNAIL_BUCKET, PROJECT_THUMBNAIL_MAX_BYTES, PROJECT_THUMBNAIL_MIME_TYPES } from "./types";

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function validateThumbnailFile(file: File) {
  if (!(PROJECT_THUMBNAIL_MIME_TYPES as readonly string[]).includes(file.type)) throw new Error("Formato inválido. Use PNG, JPG, JPEG ou WEBP.");
  if (file.size > PROJECT_THUMBNAIL_MAX_BYTES) throw new Error("A miniatura deve ter no máximo 8 MB.");
}

export async function signedThumbnailUrl(bucketId: string, objectPath: string) {
  const response = await supabase.storage.from(bucketId).createSignedUrl(objectPath, 60 * 60);
  if (response.error) throw new Error(response.error.message);
  return response.data.signedUrl;
}

export async function uploadProjectThumbnail(projectId: string, file: File): Promise<ProjectThumbnail> {
  validateThumbnailFile(file);
  const objectPath = `${projectId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const upload = await supabase.storage.from(PROJECT_THUMBNAIL_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const activation = await supabase.rpc("activate_project_thumbnail", {
    p_project_id: projectId,
    p_bucket_id: PROJECT_THUMBNAIL_BUCKET,
    p_object_path: objectPath,
    p_mime_type: file.type,
    p_file_size: file.size,
  });
  if (activation.error) {
    await supabase.storage.from(PROJECT_THUMBNAIL_BUCKET).remove([objectPath]);
    if (/function .*activate_project_thumbnail.*does not exist|schema cache/i.test(activation.error.message)) {
      throw new Error("A estrutura de miniaturas não está disponível. Aplique o SQL da Etapa 03.");
    }
    throw new Error(activation.error.message);
  }
  const row = activation.data as unknown as ProjectThumbnail;
  return { ...row, signed_url: await signedThumbnailUrl(row.bucket_id, row.object_path) };
}

export async function removeProjectThumbnail(thumbnail: ProjectThumbnail) {
  const response = await supabase.rpc("remove_project_thumbnail", { p_thumbnail_id: thumbnail.id });
  if (response.error) throw new Error(response.error.message);
  const storage = await supabase.storage.from(thumbnail.bucket_id).remove([thumbnail.object_path]);
  if (storage.error) throw new Error(`A miniatura foi removida do projeto, mas o arquivo não pôde ser apagado do armazenamento: ${storage.error.message}`);
}
