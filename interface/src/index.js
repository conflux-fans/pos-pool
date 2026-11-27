import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { completeDetect } from '@cfxjs/use-wallet-react/conflux';
import { completeDetect as completeDetectEthereum } from '@cfxjs/use-wallet-react/ethereum';
import '../public/locales';

Promise.all([completeDetect(), completeDetectEthereum()]).then(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
