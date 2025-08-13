import React, { useState } from 'react';
import { requireAuth } from '../../e2e/session';
type Item = { name: string, size: number };

export default function E2EUploadPage() {
  requireAuth();
  const [items, setItems] = useState<Item[]>([]);
  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setItems(files.map(f => ({ name: f.name, size: f.size })));
  }
  return (
    <div style={{maxWidth: 720, margin: '48px auto', padding: 24}}>
      <h2>Upload</h2>
      <input data-testid="file-input" type="file" multiple onChange={onFiles} />
      <div data-testid="recent-uploads" style={{marginTop: 16}}>
        <h3>Recent uploads</h3>
        <ul>{items.map((it, idx)=>(<li key={idx}>{it.name} ({it.size} bytes)</li>))}</ul>
      </div>
    </div>
  );
}
