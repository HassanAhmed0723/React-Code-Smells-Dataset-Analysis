class AnnotationLayerControl extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      popoverVisible: {},
      addedAnnotationIndex: null,
    };
    this.addAnnotationLayer = this.addAnnotationLayer.bind(this);
    this.removeAnnotationLayer = this.removeAnnotationLayer.bind(this);
    this.handleVisibleChange = this.handleVisibleChange.bind(this);
  }

  componentDidMount() {
    // preload the AnnotationLayer component and dependent libraries i.e. mathjs
    AnnotationLayer.preload();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { name, annotationError, validationErrors, value } = nextProps;
    if (Object.keys(annotationError).length && !validationErrors.length) {
      this.props.actions.setControlValue(
        name,
        value,
        Object.keys(annotationError),
      );
    }
    if (!Object.keys(annotationError).length && validationErrors.length) {
      this.props.actions.setControlValue(name, value, []);
    }
  }

  addAnnotationLayer(originalAnnotation, newAnnotation) {
    let annotations = this.props.value;
    if (annotations.includes(originalAnnotation)) {
      annotations = annotations.map(anno =>
        anno === originalAnnotation ? newAnnotation : anno,
      );
    } else {
      annotations = [...annotations, newAnnotation];
      this.setState({ addedAnnotationIndex: annotations.length - 1 });
    }

    this.props.refreshAnnotationData({
      annotation: newAnnotation,
      force: true,
    });

    this.props.onChange(annotations);
  }

  handleVisibleChange(visible, popoverKey) {
    this.setState(prevState => ({
      popoverVisible: { ...prevState.popoverVisible, [popoverKey]: visible },
    }));
  }

  removeAnnotationLayer(annotation) {
    const annotations = this.props.value.filter(anno => anno !== annotation);
    // So scrollbar doesnt get stuck on hidden
    const element = getSectionContainerElement();
    if (element) {
      element.style.setProperty('overflow-y', 'auto', 'important');
    }
    this.props.onChange(annotations);
  }

  renderPopover(popoverKey, annotation, error) {
    const id = annotation?.name || '_new';

    return (
      <div id={`annotation-pop-${id}`} data-test="popover-content">
        <AnnotationLayer
          {...annotation}
          error={error}
          colorScheme={this.props.colorScheme}
          vizType={this.props.vizType}
          addAnnotationLayer={newAnnotation =>
            this.addAnnotationLayer(annotation, newAnnotation)
          }
          removeAnnotationLayer={() => this.removeAnnotationLayer(annotation)}
          close={() => {
            this.handleVisibleChange(false, popoverKey);
            this.setState({ addedAnnotationIndex: null });
          }}
        />
      </div>
    );
  }

  renderInfo(anno) {
    const { annotationError, annotationQuery, theme } = this.props;
    if (annotationQuery[anno.name]) {
      return (
        <i
          className="fa fa-refresh"
          style={{ color: theme.colors.primary.base }}
          aria-hidden
        />
      );
    }
    if (annotationError[anno.name]) {
      return (
        <InfoTooltipWithTrigger
          label="validation-errors"
          bsStyle="danger"
          tooltip={annotationError[anno.name]}
        />
      );
    }
    if (!anno.show) {
      return <span style={{ color: theme.colors.error.base }}> Hidden </span>;
    }
    return '';
  }

  render() {
    const { addedAnnotationIndex } = this.state;
    const addedAnnotation = this.props.value[addedAnnotationIndex];

    const annotations = this.props.value.map((anno, i) => (
      <ControlPopover
        key={i}
        trigger="click"
        title={t('Edit annotation layer')}
        css={theme => ({
          '&:hover': {
            cursor: 'pointer',
            backgroundColor: theme.colors.grayscale.light4,
          },
        })}
        content={this.renderPopover(
          i,
          anno,
          this.props.annotationError[anno.name],
        )}
        visible={this.state.popoverVisible[i]}
        onVisibleChange={visible => this.handleVisibleChange(visible, i)}
      >
        <CustomListItem selectable>
          <span>{anno.name}</span>
          <span style={{ float: 'right' }}>{this.renderInfo(anno)}</span>
        </CustomListItem>
      </ControlPopover>
    ));

    const addLayerPopoverKey = 'add';
    return (
      <div>
        <List bordered css={theme => ({ borderRadius: theme.gridUnit })}>
          {annotations}
          <ControlPopover
            trigger="click"
            content={this.renderPopover(addLayerPopoverKey, addedAnnotation)}
            title={t('Add annotation layer')}
            visible={this.state.popoverVisible[addLayerPopoverKey]}
            destroyTooltipOnHide
            onVisibleChange={visible =>
              this.handleVisibleChange(visible, addLayerPopoverKey)
            }
          >
            <CustomListItem selectable>
              <i
                data-test="add-annotation-layer-button"
                className="fa fa-plus"
              />{' '}
              &nbsp; {t('Add annotation layer')}
            </CustomListItem>
          </ControlPopover>
        </List>
      </div>
    );
  }
}


