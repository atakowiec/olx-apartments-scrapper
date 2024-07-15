import fs from 'fs';

export function writeFile(path: string, content: string) {
  fs.writeFileSync(path, content, 'utf-8')
}