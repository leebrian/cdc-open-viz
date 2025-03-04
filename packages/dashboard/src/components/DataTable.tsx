import React, { useEffect, useState, useMemo, memo } from 'react'
import { useTable, useSortBy, useResizeColumns, useBlockLayout } from 'react-table'
import Papa from 'papaparse'
import { Base64 } from 'js-base64'
import CoveMediaControls from '@cdc/core/components/CoveMediaControls'
import Icon from '@cdc/core/components/ui/Icon'

import ErrorBoundary from '@cdc/core/components/ErrorBoundary'

/* eslint-disable react-hooks/exhaustive-deps */

export default function DataTable(props) {
  const { data, downloadData, datasetKey, config, dataFileSourceType } = props
  const [tableExpanded, setTableExpanded] = useState<boolean>(config.table ? config.table.expanded : false)
  const [accessibilityLabel, setAccessibilityLabel] = useState('')

  const DownloadButton = memo(({ data }: any) => {
    const fileName = `${config.title ? config.title.substring(0, 50) : 'cdc-open-viz'}.csv`

    const csvData = Papa.unparse(downloadData || data)

    const saveBlob = () => {
      //@ts-ignore
      if (typeof window.navigator.msSaveBlob === 'function') {
        const dataBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
        //@ts-ignore
        window.navigator.msSaveBlob(dataBlob, fileName)
      }
    }

    return (
      <a download={fileName} onClick={saveBlob} href={`data:text/csv;base64,${Base64.encode(csvData)}`} aria-label='Download this data in a CSV file format.' className={`no-border dashboard-download-link`}>
        Download {datasetKey ? `"${datasetKey}"` : 'Data'} (CSV)
      </a>
    )
  })

  // Creates columns structure for the table
  const tableColumns = useMemo(() => {
    const newTableColumns = []

    // catch no data errors and update the table header.
    if (data.length === 0) {
      return [
        {
          Header: 'No Data Found'
        }
      ]
    } else {
      Object.keys(data[0]).forEach(key => {
        const newCol = {
          Header: key,
          Cell: ({ row }) => {
            return <>{row.original[key]}</>
          },
          id: key,
          canSort: true
        }

        newTableColumns.push(newCol)
      })
    }

    return newTableColumns
  }, [config])

  const tableData = useMemo(() => data, [data])

  // Change accessibility label depending on expanded status
  useEffect(() => {
    const expandedLabel = 'Accessible data table.'
    const collapsedLabel = 'Accessible data table. This table is currently collapsed visually but can still be read using a screen reader.'

    if (tableExpanded === true && accessibilityLabel !== expandedLabel) {
      setAccessibilityLabel(expandedLabel)
    }

    if (tableExpanded === false && accessibilityLabel !== collapsedLabel) {
      setAccessibilityLabel(collapsedLabel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableExpanded])

  const defaultColumn = useMemo(
    () => ({
      minWidth: 150,
      width: 200,
      maxWidth: 400
    }),
    []
  )

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns: tableColumns, data: tableData, defaultColumn }, useSortBy, useBlockLayout, useResizeColumns)

  return (
    <ErrorBoundary component='DataTable'>
      <CoveMediaControls.Section classes={['download-links']}>
        {config.table.showDownloadUrl && dataFileSourceType === 'url' && (
          <a className='dashboard-download-link' href={config.datasets[datasetKey].dataFileName} title='Link to View Dataset' target='_blank'>
            {' '}
            {/* eslint-disable-line */}
            Link to View Dataset
          </a>
        )}
        {config.table.download && <DownloadButton data={data} />}
      </CoveMediaControls.Section>
      {config.table.show && (
        <section className={`data-table-container`} aria-label={accessibilityLabel}>
          <div
            role='button'
            className={tableExpanded ? 'data-table-heading' : 'collapsed data-table-heading'}
            onClick={() => {
              setTableExpanded(!tableExpanded)
            }}
            tabIndex={0}
            onKeyDown={e => {
              if (e.keyCode === 13) {
                setTableExpanded(!tableExpanded)
              }
            }}
          >
            <Icon display={tableExpanded ? 'minus' : 'plus'} base/>
            {config.table.label}
            {datasetKey ? `: ${datasetKey}` : ''}
          </div>
          <div className='table-container' style={{ maxHeight: config.table && config.table.limitHeight && `${config.table.height}px`, overflowY: 'scroll' }}>
            <table className={tableExpanded ? 'data-table' : 'data-table cdcdataviz-sr-only'} hidden={!tableExpanded} {...getTableProps()}>
              <caption className='visually-hidden'>{config.table.label}</caption>
              <thead>
                {headerGroups &&
                  headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                      {headerGroup.headers.map(column => (
                        <th tabIndex='0' {...column.getHeaderProps(column.getSortByToggleProps())} className={column.isSorted ? (column.isSortedDesc ? 'sort sort-desc' : 'sort sort-asc') : 'sort'} title={column.Header}>
                          {column.render('Header')}
                          <div {...column.getResizerProps()} className='resizer' />
                        </th>
                      ))}
                    </tr>
                  ))}
              </thead>
              {rows && (
                <tbody {...getTableBodyProps()}>
                  {rows.map(row => {
                    prepareRow(row)
                    return (
                      <tr {...row.getRowProps()}>
                        {row.cells &&
                          row.cells.map(cell => (
                            <>
                              {/* eslint-disable-next-line */}
                              <td tabIndex='0' {...cell.getCellProps()}>
                                {cell.render('Cell')}
                              </td>
                            </>
                          ))}
                      </tr>
                    )
                  })}
                </tbody>
              )}
            </table>
          </div>
        </section>
      )}
    </ErrorBoundary>
  )
}
