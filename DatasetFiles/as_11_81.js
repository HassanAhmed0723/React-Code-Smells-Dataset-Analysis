class DeckGLPolygon extends React.Component {
    containerRef = React.createRef();
  
    constructor(props) {
      super(props);
  
      this.state = DeckGLPolygon.getDerivedStateFromProps(props);
  
      this.getLayers = this.getLayers.bind(this);
      this.onSelect = this.onSelect.bind(this);
      this.onValuesChange = this.onValuesChange.bind(this);
    }
  
    static getDerivedStateFromProps(props, state) {
      const { width, height, formData, payload } = props;
  
      // the state is computed only from the payload; if it hasn't changed, do
      // not recompute state since this would reset selections and/or the play
      // slider position due to changes in form controls
      if (state && payload.form_data === state.formData) {
        return null;
      }
  
      const features = payload.data.features || [];
      const timestamps = features.map(f => f.__timestamp);
  
      // the granularity has to be read from the payload form_data, not the
      // props formData which comes from the instantaneous controls state
      const granularity =
        payload.form_data.time_grain_sqla ||
        payload.form_data.granularity ||
        'P1D';
  
      const { start, end, getStep, values, disabled } = getPlaySliderParams(
        timestamps,
        granularity,
      );
  
      let { viewport } = props;
      if (formData.autozoom) {
        viewport = fitViewport(viewport, {
          width,
          height,
          points: features.flatMap(getPointsFromPolygon),
        });
      }
  
      return {
        start,
        end,
        getStep,
        values,
        disabled,
        viewport,
        selected: [],
        lastClick: 0,
        formData: payload.form_data,
      };
    }
  
    onSelect(polygon) {
      const { formData, onAddFilter } = this.props;
  
      const now = new Date();
      const doubleClick = now - this.state.lastClick <= DOUBLE_CLICK_THRESHOLD;
  
      // toggle selected polygons
      const selected = [...this.state.selected];
      if (doubleClick) {
        selected.splice(0, selected.length, polygon);
      } else if (formData.toggle_polygons) {
        const i = selected.indexOf(polygon);
        if (i === -1) {
          selected.push(polygon);
        } else {
          selected.splice(i, 1);
        }
      } else {
        selected.splice(0, 1, polygon);
      }
  
      this.setState({ selected, lastClick: now });
      if (formData.table_filter) {
        onAddFilter(formData.line_column, selected, false, true);
      }
    }
  
    onValuesChange(values) {
      this.setState({
        values: Array.isArray(values)
          ? values
          : [values, values + this.state.getStep(values)],
      });
    }
  
    getLayers(values) {
      if (this.props.payload.data.features === undefined) {
        return [];
      }
  
      const filters = [];
  
      // time filter
      if (values[0] === values[1] || values[1] === this.end) {
        filters.push(
          d => d.__timestamp >= values[0] && d.__timestamp <= values[1],
        );
      } else {
        filters.push(
          d => d.__timestamp >= values[0] && d.__timestamp < values[1],
        );
      }
  
      const layer = getLayer(
        this.props.formData,
        this.props.payload,
        this.props.onAddFilter,
        this.setTooltip,
        this.state.selected,
        this.onSelect,
        filters,
      );
  
      return [layer];
    }
  
    setTooltip = tooltip => {
      const { current } = this.containerRef;
      if (current) {
        current.setTooltip(tooltip);
      }
    };
  
    render() {
      const { payload, formData, setControlValue } = this.props;
      const { start, end, getStep, values, disabled, viewport } = this.state;
  
      const fd = formData;
      const metricLabel = fd.metric ? fd.metric.label || fd.metric : null;
      const accessor = d => d[metricLabel];
  
      const buckets = getBuckets(formData, payload.data.features, accessor);
  
      return (
        <div style={{ position: 'relative' }}>
          <AnimatableDeckGLContainer
            ref={this.containerRef}
            aggregation
            getLayers={this.getLayers}
            start={start}
            end={end}
            getStep={getStep}
            values={values}
            disabled={disabled}
            viewport={viewport}
            width={this.props.width}
            height={this.props.height}
            mapboxApiAccessToken={payload.data.mapboxApiKey}
            mapStyle={formData.mapbox_style}
            setControlValue={setControlValue}
            onValuesChange={this.onValuesChange}
            onViewportChange={this.onViewportChange}
          >
            {formData.metric !== null && (
              <Legend
                categories={buckets}
                position={formData.legend_position}
                format={formData.legend_format}
              />
            )}
          </AnimatableDeckGLContainer>
        </div>
      );
    }
  }
