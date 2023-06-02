class DeckGLScreenGrid extends React.PureComponent {
  containerRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = DeckGLScreenGrid.getDerivedStateFromProps(props);

    this.getLayers = this.getLayers.bind(this);
    this.onValuesChange = this.onValuesChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    // the state is computed only from the payload; if it hasn't changed, do
    // not recompute state since this would reset selections and/or the play
    // slider position due to changes in form controls
    if (state && props.payload.form_data === state.formData) {
      return null;
    }

    const features = props.payload.data.features || [];
    const timestamps = features.map(f => f.__timestamp);

    // the granularity has to be read from the payload form_data, not the
    // props formData which comes from the instantaneous controls state
    const granularity =
      props.payload.form_data.time_grain_sqla ||
      props.payload.form_data.granularity ||
      'P1D';

    const { start, end, getStep, values, disabled } = getPlaySliderParams(
      timestamps,
      granularity,
    );
    const { width, height, formData } = props;

    let { viewport } = props;
    if (formData.autozoom) {
      viewport = fitViewport(viewport, {
        width,
        height,
        points: getPoints(features),
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
      formData: props.payload.form_data,
    };
  }

  onValuesChange(values) {
    this.setState({
      values: Array.isArray(values)
        ? values
        : // eslint-disable-next-line react/no-access-state-in-setstate
          [values, values + this.state.getStep(values)],
    });
  }

  getLayers(values) {
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
    const { formData, payload, setControlValue } = this.props;

    return (
      <div>
        <AnimatableDeckGLContainer
          ref={this.containerRef}
          aggregation
          getLayers={this.getLayers}
          start={this.state.start}
          end={this.state.end}
          getStep={this.state.getStep}
          values={this.state.values}
          disabled={this.state.disabled}
          viewport={this.state.viewport}
          width={this.props.width}
          height={this.props.height}
          mapboxApiAccessToken={payload.data.mapboxApiKey}
          mapStyle={formData.mapbox_style}
          setControlValue={setControlValue}
          onValuesChange={this.onValuesChange}
          onViewportChange={this.onViewportChange}
        />
      </div>
    );
  }
}


