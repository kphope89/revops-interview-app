import React from 'react'
import ReactDOM from 'react-dom/client'
import TeleprompterWindow from './components/TeleprompterWindow'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TeleprompterWindow />
  </React.StrictMode>
)
