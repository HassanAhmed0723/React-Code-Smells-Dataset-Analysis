export class Tabs extends React.PureComponent {
  constructor(props) {
    super(props);
    const { tabIndex, activeKey } = this.getTabInfo(props);

    this.state = {
      tabIndex,
      activeKey,
    };
    this.handleClickTab = this.handleClickTab.bind(this);
    this.handleDeleteComponent = this.handleDeleteComponent.bind(this);
    this.handleDeleteTab = this.handleDeleteTab.bind(this);
    this.handleDropOnTab = this.handleDropOnTab.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
  }

  componentDidMount() {
    this.props.setActiveTabs(this.state.activeKey);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activeKey !== this.state.activeKey) {
      this.props.setActiveTabs(this.state.activeKey, prevState.activeKey);
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const maxIndex = Math.max(0, nextProps.component.children.length - 1);
    const currTabsIds = this.props.component.children;
    const nextTabsIds = nextProps.component.children;

    if (this.state.tabIndex > maxIndex) {
      this.setState(() => ({ tabIndex: maxIndex }));
    }

    // reset tab index if dashboard was changed
    if (nextProps.dashboardId !== this.props.dashboardId) {
      const { tabIndex, activeKey } = this.getTabInfo(nextProps);
      this.setState(() => ({
        tabIndex,
        activeKey,
      }));
    }

    if (nextProps.isComponentVisible) {
      const nextFocusComponent = getLeafComponentIdFromPath(
        nextProps.directPathToChild,
      );
      const currentFocusComponent = getLeafComponentIdFromPath(
        this.props.directPathToChild,
      );

      // If the currently selected component is different than the new one,
      // or the tab length/order changed, calculate the new tab index and
      // replace it if it's different than the current one
      if (
        nextFocusComponent !== currentFocusComponent ||
        (nextFocusComponent === currentFocusComponent &&
          currTabsIds !== nextTabsIds)
      ) {
        const nextTabIndex = findTabIndexByComponentId({
          currentComponent: nextProps.component,
          directPathToChild: nextProps.directPathToChild,
        });

        // make sure nextFocusComponent is under this tabs component
        if (nextTabIndex > -1 && nextTabIndex !== this.state.tabIndex) {
          this.setState(() => ({
            tabIndex: nextTabIndex,
            activeKey: nextTabsIds[nextTabIndex],
          }));
        }
      }
    }
  }

  getTabInfo = props => {
    let tabIndex = Math.max(
      0,
      findTabIndexByComponentId({
        currentComponent: props.component,
        directPathToChild: props.directPathToChild,
      }),
    );
    if (tabIndex === 0 && props.activeTabs?.length) {
      props.component.children.forEach((tabId, index) => {
        if (tabIndex === 0 && props.activeTabs.includes(tabId)) {
          tabIndex = index;
        }
      });
    }
    const { children: tabIds } = props.component;
    const activeKey = tabIds[tabIndex];

    return {
      tabIndex,
      activeKey,
    };
  };

  showDeleteConfirmModal = key => {
    const { component, deleteComponent } = this.props;
    AntdModal.confirm({
      title: t('Delete dashboard tab?'),
      content: (
        <span>
          {t(
            'Deleting a tab will remove all content within it. You may still ' +
              'reverse this action with the',
          )}{' '}
          <b>{t('undo')}</b>{' '}
          {t('button (cmd + z) until you save your changes.')}
        </span>
      ),
      onOk: () => {
        deleteComponent(key, component.id);
        const tabIndex = component.children.indexOf(key);
        this.handleDeleteTab(tabIndex);
      },
      okType: 'danger',
      okText: t('DELETE'),
      cancelText: t('CANCEL'),
      icon: null,
    });
  };

  handleEdit = (event, action) => {
    const { component, createComponent } = this.props;
    if (action === 'add') {
      // Prevent the tab container to be selected
      event?.stopPropagation?.();

      createComponent({
        destination: {
          id: component.id,
          type: component.type,
          index: component.children.length,
        },
        dragging: {
          id: NEW_TAB_ID,
          type: TAB_TYPE,
        },
      });
    } else if (action === 'remove') {
      this.showDeleteConfirmModal(event);
    }
  };

  handleClickTab(tabIndex) {
    const { component } = this.props;
    const { children: tabIds } = component;

    if (tabIndex !== this.state.tabIndex) {
      const pathToTabIndex = getDirectPathToTabIndex(component, tabIndex);
      const targetTabId = pathToTabIndex[pathToTabIndex.length - 1];
      this.props.logEvent(LOG_ACTIONS_SELECT_DASHBOARD_TAB, {
        target_id: targetTabId,
        index: tabIndex,
      });

      this.props.onChangeTab({ pathToTabIndex });
    }
    this.setState(() => ({ activeKey: tabIds[tabIndex] }));
  }

  handleDeleteComponent() {
    const { deleteComponent, id, parentId } = this.props;
    deleteComponent(id, parentId);
  }

  handleDeleteTab(tabIndex) {
    // If we're removing the currently selected tab,
    // select the previous one (if any)
    if (this.state.tabIndex === tabIndex) {
      this.handleClickTab(Math.max(0, tabIndex - 1));
    }
  }

  handleDropOnTab(dropResult) {
    const { component } = this.props;

    // Ensure dropped tab is visible
    const { destination } = dropResult;
    if (destination) {
      const dropTabIndex =
        destination.id === component.id
          ? destination.index // dropped ON tabs
          : component.children.indexOf(destination.id); // dropped IN tab

      if (dropTabIndex > -1) {
        setTimeout(() => {
          this.handleClickTab(dropTabIndex);
        }, 30);
      }
    }
  }

  handleDrop(dropResult) {
    if (dropResult.dragging.type !== TABS_TYPE) {
      this.props.handleComponentDrop(dropResult);
    }
  }

  render() {
    const {
      depth,
      component: tabsComponent,
      parentComponent,
      index,
      availableColumnCount,
      columnWidth,
      onResizeStart,
      onResize,
      onResizeStop,
      renderTabContent,
      renderHoverMenu,
      isComponentVisible: isCurrentTabVisible,
      editMode,
      nativeFilters,
    } = this.props;

    const { children: tabIds } = tabsComponent;
    const { tabIndex: selectedTabIndex, activeKey } = this.state;

    let tabsToHighlight;
    const highlightedFilterId =
      nativeFilters?.focusedFilterId || nativeFilters?.hoveredFilterId;
    if (highlightedFilterId) {
      tabsToHighlight = nativeFilters.filters[highlightedFilterId]?.tabsInScope;
    }
    return (
      <DragDroppable
        component={tabsComponent}
        parentComponent={parentComponent}
        orientation="row"
        index={index}
        depth={depth}
        onDrop={this.handleDrop}
        editMode={editMode}
      >
        {({
          dropIndicatorProps: tabsDropIndicatorProps,
          dragSourceRef: tabsDragSourceRef,
        }) => (
          <StyledTabsContainer
            className="dashboard-component dashboard-component-tabs"
            data-test="dashboard-component-tabs"
          >
            {editMode && renderHoverMenu && (
              <HoverMenu innerRef={tabsDragSourceRef} position="left">
                <DragHandle position="left" />
                <DeleteComponentButton onDelete={this.handleDeleteComponent} />
              </HoverMenu>
            )}

            <LineEditableTabs
              id={tabsComponent.id}
              activeKey={activeKey}
              onChange={key => {
                this.handleClickTab(tabIds.indexOf(key));
              }}
              onEdit={this.handleEdit}
              data-test="nav-list"
              type={editMode ? 'editable-card' : 'card'}
            >
              {tabIds.map((tabId, tabIndex) => (
                <LineEditableTabs.TabPane
                  key={tabId}
                  tab={
                    <DashboardComponent
                      id={tabId}
                      parentId={tabsComponent.id}
                      depth={depth}
                      index={tabIndex}
                      renderType={RENDER_TAB}
                      availableColumnCount={availableColumnCount}
                      columnWidth={columnWidth}
                      onDropOnTab={this.handleDropOnTab}
                      onHoverTab={() => this.handleClickTab(tabIndex)}
                      isFocused={activeKey === tabId}
                      isHighlighted={
                        activeKey !== tabId && tabsToHighlight?.includes(tabId)
                      }
                    />
                  }
                >
                  {renderTabContent && (
                    <DashboardComponent
                      id={tabId}
                      parentId={tabsComponent.id}
                      depth={depth} // see isValidChild.js for why tabs don't increment child depth
                      index={tabIndex}
                      renderType={RENDER_TAB_CONTENT}
                      availableColumnCount={availableColumnCount}
                      columnWidth={columnWidth}
                      onResizeStart={onResizeStart}
                      onResize={onResize}
                      onResizeStop={onResizeStop}
                      onDropOnTab={this.handleDropOnTab}
                      isComponentVisible={
                        selectedTabIndex === tabIndex && isCurrentTabVisible
                      }
                    />
                  )}
                </LineEditableTabs.TabPane>
              ))}
            </LineEditableTabs>

            {/* don't indicate that a drop on root is allowed when tabs already exist */}
            {tabsDropIndicatorProps &&
              parentComponent.id !== DASHBOARD_ROOT_ID && (
                <div {...tabsDropIndicatorProps} />
              )}
          </StyledTabsContainer>
        )}
      </DragDroppable>
    );
  }
}


