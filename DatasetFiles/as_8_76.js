export class DeckGLContainer extends React.Component {
    constructor(props) {
      super(props);
      this.tick = this.tick.bind(this);
      this.onViewStateChange = this.onViewStateChange.bind(this);
      // This has to be placed after this.tick is bound to this
      this.state = {
        timer: setInterval(this.tick, TICK),
        tooltip: null,
        viewState: props.viewport,
      };
    }
  
    UNSAFE_componentWillReceiveProps(nextProps) {
      if (!isEqual(nextProps.viewport, this.props.viewport)) {
        this.setState({ viewState: nextProps.viewport });
      }
    }
  
    componentWillUnmount() {
      clearInterval(this.state.timer);
    }
  
    onViewStateChange({ viewState }) {
      this.setState({ viewState, lastUpdate: Date.now() });
    }
  
    tick() {
      // Rate limiting updating viewport controls as it triggers lotsa renders
      const { lastUpdate } = this.state;
      if (lastUpdate && Date.now() - lastUpdate > TICK) {
        const setCV = this.props.setControlValue;
        if (setCV) {
          setCV('viewport', this.state.viewState);
        }
        this.setState({ lastUpdate: null });
      }
    }
  
    layers() {
      // Support for layer factory
      if (this.props.layers.some(l => typeof l === 'function')) {
        return this.props.layers.map(l => (typeof l === 'function' ? l() : l));
      }
  
      return this.props.layers;
    }
  
    setTooltip = tooltip => {
      this.setState({ tooltip });
    };
  
    render() {
      const { children, bottomMargin, height, width } = this.props;
      const { viewState, tooltip } = this.state;
      const adjustedHeight = height - bottomMargin;
  
      const layers = this.layers();
  
      return (
        <>
          <div style={{ position: 'relative', width, height: adjustedHeight }}>
            <DeckGL
              initWebGLParameters
              controller
              width={width}
              height={adjustedHeight}
              layers={layers}
              viewState={viewState}
              glOptions={{ preserveDrawingBuffer: true }}
              onViewStateChange={this.onViewStateChange}
            >
              <StaticMap
                preserveDrawingBuffer
                mapStyle={this.props.mapStyle}
                mapboxApiAccessToken={this.props.mapboxApiAccessToken}
              />
            </DeckGL>
            {children}
          </div>
          <Tooltip tooltip={tooltip} />
        </>
      );
    }
  }


