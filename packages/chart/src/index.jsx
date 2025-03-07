import React from 'react'
import ReactDOM from 'react-dom/client'

import CdcChart from './CdcChart'

import 'react-tooltip/dist/react-tooltip.css'

let isEditor = window.location.href.includes('editor=true')

let domContainer = document.getElementsByClassName('react-container')[0]

ReactDOM.createRoot(domContainer).render(
  <React.StrictMode>
    <CdcChart configUrl={domContainer.attributes['data-config'].value} isEditor={isEditor} />
  </React.StrictMode>,
)
