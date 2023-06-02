class CssEditor extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      css: props.initialCss,
    };
    this.changeCss = this.changeCss.bind(this);
    this.changeCssTemplate = this.changeCssTemplate.bind(this);
  }

  componentDidMount() {
    AceCssEditor.preload();
  }

  changeCss(css) {
    this.setState({ css }, () => {
      this.props.onChange(css);
    });
  }

  changeCssTemplate({ key }) {
    this.changeCss(key);
  }

  renderTemplateSelector() {
    if (this.props.templates) {
      const menu = (
        <Menu onClick={this.changeCssTemplate}>
          {this.props.templates.map(template => (
            <Menu.Item key={template.css}>{template.label}</Menu.Item>
          ))}
        </Menu>
      );

      return (
        <AntdDropdown overlay={menu} placement="bottomRight">
          <Button>{t('Load a CSS template')}</Button>
        </AntdDropdown>
      );
    }
    return null;
  }

  render() {
    return (
      <ModalTrigger
        triggerNode={this.props.triggerNode}
        modalTitle={t('CSS')}
        modalBody={
          <StyledWrapper>
            <div className="css-editor-header">
              <h5>{t('Live CSS editor')}</h5>
              {this.renderTemplateSelector()}
            </div>
            <AceCssEditor
              className="css-editor"
              minLines={12}
              maxLines={30}
              onChange={this.changeCss}
              height="200px"
              width="100%"
              editorProps={{ $blockScrolling: true }}
              enableLiveAutocompletion
              value={this.state.css || ''}
            />
          </StyledWrapper>
        }
      />
    );
  }
}


