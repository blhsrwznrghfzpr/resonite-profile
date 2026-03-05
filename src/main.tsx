import { render } from 'preact';
import { I18nProvider } from './i18n/context.tsx';
import { App } from './components/App.tsx';
import './style.css';

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  document.getElementById('app')!
);
