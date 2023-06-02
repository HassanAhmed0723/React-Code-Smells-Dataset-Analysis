class ReactifiedComponent extends React.Component {
    container;
  
    constructor(props) {
      super(props);
      this.setContainerRef = this.setContainerRef.bind(this);
    }
  
    componentDidMount() {
      this.execute();
    }
  
    componentDidUpdate() {
      this.execute();
    }
  
    componentWillUnmount() {
      this.container = undefined;
      if (callbacks?.componentWillUnmount) {
        callbacks.componentWillUnmount.bind(this)();
      }
    }
  
    setContainerRef(ref) {
      this.container = ref;
    }
  
    execute() {
      if (this.container) {
        renderFn(this.container, this.props);
      }
    }
  
    render() {
      const { id, className } = this.props;
  
      return <div ref={this.setContainerRef} id={id} className={className} />;
    }
  }


