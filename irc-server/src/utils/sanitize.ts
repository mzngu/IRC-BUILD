import * as createDOMPurify from 'dompurify'; 
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');

const DOMPurify = createDOMPurify(window as any);

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html);
}