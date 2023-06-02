export default class CategoricalDeckGLContainer extends React.PureComponent {
    containerRef = React.createRef();
  
    /*
     * A Deck.gl container that handles categories.
     *
     * The container will have an interactive legend, populated from the
     * categories present in the data.
     */
    constructor(props) {
      super(props);
      this.state = this.getStateFromProps(props);
  
      this.getLayers = this.getLayers.bind(this);
      this.onValuesChange = this.onValuesChange.bind(this);
      this.toggleCategory = this.toggleCategory.bind(this);
      this.showSingleCategory = this.showSingleCategory.bind(this);
    }
  
    UNSAFE_componentWillReceiveProps(nextProps) {
      if (nextProps.payload.form_data !== this.state.formData) {
        this.setState({ ...this.getStateFromProps(nextProps) });
      }
    }
  
    onValuesChange(values) {
      this.setState({
        values: Array.isArray(values)
          ? values
          : [values, values + this.state.getStep(values)],
      });
    }
  
    // eslint-disable-next-line class-methods-use-this
    getStateFromProps(props, state) {
      const features = props.payload.data.features || [];
      const timestamps = features.map(f => f.__timestamp);
      const categories = getCategories(props.formData, features);
  
      // the state is computed only from the payload; if it hasn't changed, do
      // not recompute state since this would reset selections and/or the play
      // slider position due to changes in form controls
      if (state && props.payload.form_data === state.formData) {
        return { ...state, categories };
      }
  
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
          points: props.getPoints(features),
        });
      }
      if (viewport.zoom < 0) {
        viewport.zoom = 0;
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
        categories,
      };
    }
  
    getLayers(values) {
      const { getLayer, payload, formData: fd, onAddFilter } = this.props;
      let features = payload.data.features ? [...payload.data.features] : [];
  
      // Add colors from categories or fixed color
      features = this.addColor(features, fd);
  
      // Apply user defined data mutator if defined
      if (fd.js_data_mutator) {
        const jsFnMutator = sandboxedEval(fd.js_data_mutator);
        features = jsFnMutator(features);
      }
  
      // Filter by time
      if (values[0] === values[1] || values[1] === this.end) {
        features = features.filter(
          d => d.__timestamp >= values[0] && d.__timestamp <= values[1],
        );
      } else {
        features = features.filter(
          d => d.__timestamp >= values[0] && d.__timestamp < values[1],
        );
      }
  
      // Show only categories selected in the legend
      const cats = this.state.categories;
      if (fd.dimension) {
        features = features.filter(
          d => cats[d.cat_color] && cats[d.cat_color].enabled,
        );
      }
  
      const filteredPayload = {
        ...payload,
        data: { ...payload.data, features },
      };
  
      return [
        getLayer(
          fd,
          filteredPayload,
          onAddFilter,
          this.setTooltip,
          this.props.datasource,
        ),
      ];
    }
  
    // eslint-disable-next-line class-methods-use-this
    addColor(data, fd) {
      const c = fd.color_picker || { r: 0, g: 0, b: 0, a: 1 };
      const colorFn = getScale(fd.color_scheme);
  
      return data.map(d => {
        let color;
        if (fd.dimension) {
          color = hexToRGB(colorFn(d.cat_color, fd.sliceId), c.a * 255);
  
          return { ...d, color };
        }
  
        return d;
      });
    }
  
    toggleCategory(category) {
      const categoryState = this.state.categories[category];
      const categories = {
        ...this.state.categories,
        [category]: {
          ...categoryState,
          enabled: !categoryState.enabled,
        },
      };
  
      // if all categories are disabled, enable all -- similar to nvd3
      if (Object.values(categories).every(v => !v.enabled)) {
        /* eslint-disable no-param-reassign */
        Object.values(categories).forEach(v => {
          v.enabled = true;
        });
      }
      this.setState({ categories });
    }
  
    showSingleCategory(category) {
      const categories = { ...this.state.categories };
      /* eslint-disable no-param-reassign */
      Object.values(categories).forEach(v => {
        v.enabled = false;
      });
      categories[category].enabled = true;
      this.setState({ categories });
    }
  
    setTooltip = tooltip => {
      const { current } = this.containerRef;
      if (current) {
        current.setTooltip(tooltip);
      }
    };
  
    render() {
      return (
        <div style={{ position: 'relative' }}>
          <AnimatableDeckGLContainer
            ref={this.containerRef}
            getLayers={this.getLayers}
            start={this.state.start}
            end={this.state.end}
            getStep={this.state.getStep}
            values={this.state.values}
            disabled={this.state.disabled}
            viewport={this.state.viewport}
            mapboxApiAccessToken={this.props.mapboxApiKey}
            mapStyle={this.props.formData.mapbox_style}
            setControlValue={this.props.setControlValue}
            width={this.props.width}
            height={this.props.height}
          >
            <Legend
              forceCategorical
              categories={this.state.categories}
              format={this.props.formData.legend_format}
              position={this.props.formData.legend_position}
              showSingleCategory={this.showSingleCategory}
              toggleCategory={this.toggleCategory}
            />
          </AnimatableDeckGLContainer>
        </div>
      );
    }
}


