class HorizonRow extends React.PureComponent {
    componentDidMount() {
      this.drawChart();
    }
  
    componentDidUpdate() {
      this.drawChart();
    }
  
    componentWillUnmount() {
      this.canvas = null;
    }
  
    drawChart() {
      if (this.canvas) {
        const {
          data: rawData,
          yDomain,
          width,
          height,
          bands,
          colors,
          colorScale,
          offsetX,
          mode,
        } = this.props;
  
        const data =
          colorScale === 'change'
            ? rawData.map(d => ({ ...d, y: d.y - rawData[0].y }))
            : rawData;
  
        const context = this.canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, width, height);
        // Reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.translate(0.5, 0.5);
  
        const step = width / data.length;
        // the data frame currently being shown:
        const startIndex = Math.floor(Math.max(0, -(offsetX / step)));
        const endIndex = Math.floor(
          Math.min(data.length, startIndex + width / step),
        );
  
        // skip drawing if there's no data to be drawn
        if (startIndex > data.length) {
          return;
        }
  
        // Create y-scale
        const [min, max] = yDomain || d3Extent(data, d => d.y);
        const y = scaleLinear()
          .domain([0, Math.max(-min, max)])
          .range([0, height]);
  
        // we are drawing positive & negative bands separately to avoid mutating canvas state
        // http://www.html5rocks.com/en/tutorials/canvas/performance/
        let hasNegative = false;
        // draw positive bands
        let value;
        let bExtents;
        for (let b = 0; b < bands; b += 1) {
          context.fillStyle = colors[bands + b];
  
          // Adjust the range based on the current band index.
          bExtents = (b + 1 - bands) * height;
          y.range([bands * height + bExtents, bExtents]);
  
          // only the current data frame is being drawn i.e. what's visible:
          for (let i = startIndex; i < endIndex; i += 1) {
            value = data[i].y;
            if (value <= 0) {
              hasNegative = true;
              continue;
            }
            if (value !== undefined) {
              context.fillRect(
                offsetX + i * step,
                y(value),
                step + 1,
                y(0) - y(value),
              );
            }
          }
        }
  
        // draw negative bands
        if (hasNegative) {
          // mirror the negative bands, by flipping the canvas
          if (mode === 'offset') {
            context.translate(0, height);
            context.scale(1, -1);
          }
  
          for (let b = 0; b < bands; b += 1) {
            context.fillStyle = colors[bands - b - 1];
  
            // Adjust the range based on the current band index.
            bExtents = (b + 1 - bands) * height;
            y.range([bands * height + bExtents, bExtents]);
  
            // only the current data frame is being drawn i.e. what's visible:
            for (let ii = startIndex; ii < endIndex; ii += 1) {
              value = data[ii].y;
              if (value >= 0) {
                continue;
              }
              context.fillRect(
                offsetX + ii * step,
                y(-value),
                step + 1,
                y(0) - y(-value),
              );
            }
          }
        }
      }
    }
  
    render() {
      const { className, title, width, height } = this.props;
  
      return (
        <div className={`horizon-row ${className}`}>
          <span className="title">{title}</span>
          <canvas
            ref={c => {
              this.canvas = c;
            }}
            width={width}
            height={height}
          />
        </div>
      );
    }
}
  

