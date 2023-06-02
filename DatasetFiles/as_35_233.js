class Row extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isFocused: false,
      isInView: false,
    };
    this.handleDeleteComponent = this.handleDeleteComponent.bind(this);
    this.handleUpdateMeta = this.handleUpdateMeta.bind(this);
    this.handleChangeBackground = this.handleUpdateMeta.bind(
      this,
      'background',
    );
    this.handleChangeFocus = this.handleChangeFocus.bind(this);

    this.containerRef = React.createRef();
    this.observerEnabler = null;
    this.observerDisabler = null;
  }

  // if chart not rendered - render it if it's less than 1 view height away from current viewport
  // if chart rendered - remove it if it's more than 4 view heights away from current viewport
  componentDidMount() {
    if (
      isFeatureEnabled(FeatureFlag.DASHBOARD_VIRTUALIZATION) &&
      !isCurrentUserBot()
    ) {
      this.observerEnabler = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !this.state.isInView) {
            this.setState({ isInView: true });
          }
        },
        {
          rootMargin: '100% 0px',
        },
      );
      this.observerDisabler = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting && this.state.isInView) {
            this.setState({ isInView: false });
          }
        },
        {
          rootMargin: '400% 0px',
        },
      );
      const element = this.containerRef.current;
      if (element) {
        this.observerEnabler.observe(element);
        this.observerDisabler.observe(element);
      }
    }
  }

  componentWillUnmount() {
    this.observerEnabler?.disconnect();
    this.observerDisabler?.disconnect();
  }

  handleChangeFocus(nextFocus) {
    this.setState(() => ({ isFocused: Boolean(nextFocus) }));
  }

  handleUpdateMeta(metaKey, nextValue) {
    const { updateComponents, component } = this.props;
    if (nextValue && component.meta[metaKey] !== nextValue) {
      updateComponents({
        [component.id]: {
          ...component,
          meta: {
            ...component.meta,
            [metaKey]: nextValue,
          },
        },
      });
    }
  }

  handleDeleteComponent() {
    const { deleteComponent, component, parentId } = this.props;
    deleteComponent(component.id, parentId);
  }

  render() {
    const {
      component: rowComponent,
      parentComponent,
      index,
      availableColumnCount,
      columnWidth,
      occupiedColumnCount,
      depth,
      onResizeStart,
      onResize,
      onResizeStop,
      handleComponentDrop,
      editMode,
      onChangeTab,
      isComponentVisible,
    } = this.props;

    const rowItems = rowComponent.children || [];

    const backgroundStyle = backgroundStyleOptions.find(
      opt =>
        opt.value === (rowComponent.meta.background || BACKGROUND_TRANSPARENT),
    );

    return (
      <DragDroppable
        component={rowComponent}
        parentComponent={parentComponent}
        orientation="row"
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        editMode={editMode}
      >
        {({ dropIndicatorProps, dragSourceRef }) => (
          <WithPopoverMenu
            isFocused={this.state.isFocused}
            onChangeFocus={this.handleChangeFocus}
            disableClick
            menuItems={[
              <BackgroundStyleDropdown
                id={`${rowComponent.id}-background`}
                value={backgroundStyle.value}
                onChange={this.handleChangeBackground}
              />,
            ]}
            editMode={editMode}
          >
            {editMode && (
              <HoverMenu innerRef={dragSourceRef} position="left">
                <DragHandle position="left" />
                <DeleteComponentButton onDelete={this.handleDeleteComponent} />
                <IconButton
                  onClick={this.handleChangeFocus}
                  icon={<Icons.Cog iconSize="xl" />}
                />
              </HoverMenu>
            )}
            <GridRow
              className={cx(
                'grid-row',
                rowItems.length === 0 && 'grid-row--empty',
                backgroundStyle.className,
              )}
              data-test={`grid-row-${backgroundStyle.className}`}
              ref={this.containerRef}
            >
              {rowItems.length === 0 ? (
                <div css={emptyRowContentStyles}>{t('Empty row')}</div>
              ) : (
                rowItems.map((componentId, itemIndex) => (
                  <DashboardComponent
                    key={componentId}
                    id={componentId}
                    parentId={rowComponent.id}
                    depth={depth + 1}
                    index={itemIndex}
                    availableColumnCount={
                      availableColumnCount - occupiedColumnCount
                    }
                    columnWidth={columnWidth}
                    onResizeStart={onResizeStart}
                    onResize={onResize}
                    onResizeStop={onResizeStop}
                    isComponentVisible={isComponentVisible}
                    onChangeTab={onChangeTab}
                    isInView={this.state.isInView}
                  />
                ))
              )}

              {dropIndicatorProps && <div {...dropIndicatorProps} />}
            </GridRow>
          </WithPopoverMenu>
        )}
      </DragDroppable>
    );
  }
}


