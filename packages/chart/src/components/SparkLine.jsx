import React, { useContext, useEffect } from 'react'

import * as allCurves from '@visx/curve'
import { Group } from '@visx/group'
import { LinePath } from '@visx/shape'
import { Text } from '@visx/text'
import { scaleLinear, scalePoint } from '@visx/scale'
import { AxisBottom } from '@visx/axis'
import { MarkerArrow } from '@visx/marker'

import ErrorBoundary from '@cdc/core/components/ErrorBoundary'

import useReduceData from '../hooks/useReduceData'

import ConfigContext from '../ConfigContext'

export default function SparkLine({ width: parentWidth, height: parentHeight }) {
  const { transformedData: data, dimensions, config, parseDate, formatDate, currentViewport, seriesHighlight, formatNumber, colorScale, isNumber, handleChartAriaLabels } = useContext(ConfigContext)
  let width = parentWidth
  const { minValue, maxValue } = useReduceData(config, data, ConfigContext)

  const margin = { top: 5, right: 10, bottom: 10, left: 10 }
  const height = parentHeight

  const xMax = width - config.runtime.yAxis.size
  const yMax = height - margin.top - 20

  const getXAxisData = d => (config.runtime.xAxis.type === 'date' ? parseDate(d[config.runtime.originalXAxis.dataKey]).getTime() : d[config.runtime.originalXAxis.dataKey])
  const getYAxisData = (d, seriesKey) => d[seriesKey]

  let xScale
  let yScale
  let seriesScale
  const { max: enteredMaxValue, min: enteredMinValue } = config.runtime.yAxis
  const isMaxValid = Number(enteredMaxValue) >= Number(maxValue)
  const isMinValid = Number(enteredMinValue) <= Number(minValue)


  // REMOVE bad data points from the data set
  // Examples: NA, N/A, "1,234", "anystring"
  // - if you dont call this on data into LineGroup below, for example
  // then entire data series are removed because of the defined statement
  // i.e. if a series has any bad data points the entire series wont plot
   const cleanData = (data, testing = false) => {
    let cleanedup = []
    if (testing) console.log('## Data to clean=', data)
    data.forEach(function (d, i) {
      let cleanedSeries = {}
      Object.keys(d).forEach(function (key) {
        if (key === 'Date') {
          // pass thru the dates
          cleanedSeries[key] = d[key]
        } else {
          // remove comma and dollar signs
          let tmp = d[key] != null && d[key] != '' ? d[key].replace(/[,\$]/g, '') : ''
          if (testing) console.log("tmp no comma or $", tmp)
          if ((tmp !== '' && tmp !== null && !isNaN(tmp)) || (tmp !== '' && tmp !== null && /\d+\.?\d*/.test(tmp))) {
            cleanedSeries[key] = tmp
          } else {
            // return nothing to skip bad data point
            cleanedSeries[key] = '' // returning blank fixes broken chart draw
          }
        }
      })
      cleanedup.push(cleanedSeries)
    })
    if (testing) console.log('## cleanedData =', cleanedup)
    return cleanedup
   }

  // Just do this once up front otherwise we end up
  // calling clean several times on same set of data (TT)
  const cleanedData = cleanData(data, config.xAxis.dataKey);

  if (cleanedData) {
    let min = enteredMinValue && isMinValid ? enteredMinValue : minValue
    let max = enteredMaxValue && isMaxValid ? enteredMaxValue : Number.MIN_VALUE

    if (max === Number.MIN_VALUE) {
      max = maxValue
    }

    //Adds Y Axis data padding if applicable
    if (config.runtime.yAxis.paddingPercent) {
      let paddingValue = (max - min) * config.runtime.yAxis.paddingPercent
      min -= paddingValue
      max += paddingValue
    }

    let xAxisDataMapped = cleanedData.map(d => getXAxisData(d))

    if (config.runtime.horizontal) {
      xScale = scaleLinear({
        domain: [min, max],
        range: [0, xMax]
      })

      yScale = config.runtime.xAxis.type === 'date' ? scaleLinear({ domain: [Math.min(...xAxisDataMapped), Math.max(...xAxisDataMapped)] }) : scalePoint({ domain: xAxisDataMapped, padding: 0.5 })

      seriesScale = scalePoint({
        domain: config.runtime.barSeriesKeys || config.runtime.seriesKeys,
        range: [0, yMax]
      })

      yScale.rangeRound([0, yMax])
    } else {
      min = min < 0 ? min * 1.11 : min

      yScale = scaleLinear({
        domain: [min, max],
        range: [yMax - margin.bottom, margin.top]
      })

      xScale = scalePoint({
        domain: xAxisDataMapped,
        range: [margin.left, width - margin.right]
      })

      seriesScale = scalePoint({
        domain: config.runtime.barSeriesKeys || config.runtime.seriesKeys,
        range: [0, xMax]
      })
    }
  }

  const handleSparkLineTicks = [xScale.domain()[0], xScale.domain()[xScale.domain().length - 1]]

  return (
    <ErrorBoundary component='SparkLine'>
      <svg role='img' aria-label={handleChartAriaLabels(config)} width={width} height={height} className={'sparkline'} tabIndex={0}>
        {(config.runtime.lineSeriesKeys || config.runtime.seriesKeys).map((seriesKey, index) => (
          <>
            <Group
              className='sparkline-group'
              height={parentHeight}
              style={{ height: parentHeight }}
              top={margin.top}
              key={`series-${seriesKey}`}
              opacity={config.legend.behavior === 'highlight' && seriesHighlight.length > 0 && seriesHighlight.indexOf(seriesKey) === -1 ? 0.5 : 1}
              display={config.legend.behavior === 'highlight' || seriesHighlight.length === 0 || seriesHighlight.indexOf(seriesKey) !== -1 ? 'block' : 'none'}
            >
              {cleanedData.map((d, dataIndex) => {
                let yAxisTooltip = config.runtime.yAxis.label ? `${config.runtime.yAxis.label}: ${formatNumber(getYAxisData(d, seriesKey))}` : formatNumber(getYAxisData(d, seriesKey))
                let xAxisTooltip = config.runtime.xAxis.label ? `${config.runtime.xAxis.label}: ${d[config.runtime.xAxis.dataKey]}` : d[config.runtime.xAxis.dataKey]

                const tooltip = `<div>
									${yAxisTooltip}<br />
									${xAxisTooltip}<br />
									${config.seriesLabel ? `${config.seriesLabel}: ${seriesKey}` : ''}
									</div>`

                let circleRadii = 4.5
                return (
                  <Group key={`series-${seriesKey}-point-${dataIndex}`}>
                    <Text display={config.labels ? 'block' : 'none'} x={xScale(getXAxisData(d))} y={yScale(getYAxisData(d, seriesKey))} fill={colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000'} textAnchor='middle'>
                      {formatNumber(d[seriesKey])}
                    </Text>

                    {dataIndex + 1 !== data.length && (config.lineDatapointStyle === 'always show' || config.lineDatapointStyle === 'hover') && (
                      <circle
                        key={`${seriesKey}-${dataIndex}`}
                        r={circleRadii}
                        cx={xScale(getXAxisData(d))}
                        cy={yScale(getYAxisData(d, seriesKey))}
                        fill={colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000'}
                        style={{ fill: colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000' }}
                        data-tooltip-html={tooltip}
                        data-tooltip-id={`cdc-open-viz-tooltip-${config.runtime.uniqueId}`}
                      />
                    )}
                  </Group>
                )
              })}
              <LinePath
                curve={allCurves.curveLinear}
                data={cleanedData}
                x={d => xScale(getXAxisData(d))}
                y={d => yScale(getYAxisData(d, seriesKey))}
                stroke={colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000'}
                strokeWidth={2}
                strokeOpacity={1}
                shapeRendering='geometricPrecision'
                markerEnd={`url(#${'arrow'}--${index})`}
              />
              <MarkerArrow
                id={`arrow--${index}`}
                refX={2}
                size={6}
                markerEnd={`url(#${'arrow'}--${index})`}
                strokeOpacity={1}
                fillOpacity={1}
                // stroke={colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000'}
                fill={colorScale ? colorScale(config.runtime.seriesLabels ? config.runtime.seriesLabels[seriesKey] : seriesKey) : '#000'}
              />
            </Group>
            <AxisBottom
              top={yMax + margin.top}
              hideAxisLine
              hideTicks
              scale={xScale}
              tickValues={handleSparkLineTicks}
              tickFormat={formatDate}
              stroke={'black'}
              tickStroke={'black'}
              tickLabelProps={() => ({
                fill: 'black',
                fontSize: 11,
                textAnchor: 'middle'
              })}
            />
          </>
        ))}
      </svg>
    </ErrorBoundary>
  )
}
