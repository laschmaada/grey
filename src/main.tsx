import { render } from 'preact';
import { App } from './ui/app.js';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}