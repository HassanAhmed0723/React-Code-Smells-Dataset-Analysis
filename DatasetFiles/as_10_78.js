type deckGLComponentProps = {
    datasource: Datasource;
    formData: QueryFormData;
    height: number;
    onAddFilter: () => void;
    payload: JsonObject;
    setControlValue: () => void;
    viewport: Viewport;
    width: number;
  };
  export interface getLayerType<T> {
    (
      formData: QueryFormData,
      payload: JsonObject,
      onAddFilter: () => void,
      setTooltip: (tooltip: string) => void,
    ): T;
  }
  interface getPointsType<T> {
    (point: number[]): T;
  }
  type deckGLComponentState = {
    viewport: Viewport;
    layer: unknown;
  };
  
  export function createDeckGLComponent(
    getLayer: getLayerType<unknown>,
    getPoints: getPointsType<Point[]>,
  ): React.ComponentClass<deckGLComponentProps> {
    // Higher order component
    class Component extends React.PureComponent<
      deckGLComponentProps,
      deckGLComponentState
    > {
      containerRef: React.RefObject<DeckGLContainer> = React.createRef();
  
      constructor(props: deckGLComponentProps) {
        super(props);
  
        const { width, height, formData } = props;
        let { viewport } = props;
        if (formData.autozoom) {
          viewport = fitViewport(viewport, {
            width,
            height,
            points: getPoints(props.payload.data.features),
          }) as Viewport;
        }
  
        this.state = {
          viewport,
          layer: this.computeLayer(props),
        };
        this.onViewportChange = this.onViewportChange.bind(this);
      }
  
      UNSAFE_componentWillReceiveProps(nextProps: deckGLComponentProps) {
        // Only recompute the layer if anything BUT the viewport has changed
        const nextFdNoVP = { ...nextProps.formData, viewport: null };
        const currFdNoVP = { ...this.props.formData, viewport: null };
        if (
          !isEqual(nextFdNoVP, currFdNoVP) ||
          nextProps.payload !== this.props.payload
        ) {
          this.setState({ layer: this.computeLayer(nextProps) });
        }
      }
  
      onViewportChange(viewport: Viewport) {
        this.setState({ viewport });
      }
  
      computeLayer(props: deckGLComponentProps) {
        const { formData, payload, onAddFilter } = props;
  
        return getLayer(formData, payload, onAddFilter, this.setTooltip);
      }
  
      setTooltip = (tooltip: string) => {
        const { current } = this.containerRef;
        if (current) {
          current?.setTooltip(tooltip);
        }
      };
  
      render() {
        const { formData, payload, setControlValue, height, width } = this.props;
        const { layer, viewport } = this.state;
  
        return (
          <DeckGLContainerStyledWrapper
            ref={this.containerRef}
            mapboxApiAccessToken={payload.data.mapboxApiKey}
            viewport={viewport}
            layers={[layer]}
            mapStyle={formData.mapbox_style}
            setControlValue={setControlValue}
            width={width}
            height={height}
            onViewportChange={this.onViewportChange}
          />
        );
      }
    }
    return Component;
  }
  
  export function createCategoricalDeckGLComponent(
    getLayer: getLayerType<unknown>,
    getPoints: getPointsType<Point[]>,
  ) {
    return function Component(props: deckGLComponentProps) {
      const {
        datasource,
        formData,
        height,
        payload,
        setControlValue,
        viewport,
        width,
      } = props;
  
      return (
        <CategoricalDeckGLContainer
          datasource={datasource}
          formData={formData}
          mapboxApiKey={payload.data.mapboxApiKey}
          setControlValue={setControlValue}
          viewport={viewport}
          getLayer={getLayer}
          payload={payload}
          getPoints={getPoints}
          width={width}
          height={height}
        />
      );
    };
  }

  //as_11_81
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


  //as_12_84
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


