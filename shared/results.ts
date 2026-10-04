export function createResultFilename(title: string, extension: 'csv' | 'txt'): string {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
  return `${safeTitle}_投票結果.${extension}`;
}

export function createResultContentDisposition(title: string, extension: 'csv' | 'txt'): string {
  const encoded = encodeURIComponent(createResultFilename(title, extension)).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="voting-results.${extension}"; filename*=UTF-8''${encoded}`;
}
