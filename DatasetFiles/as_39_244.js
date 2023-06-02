class HeaderActionsDropdown extends React.PureComponent {
  static discardChanges() {
    window.location.reload();
  }

  constructor(props) {
    super(props);
    this.state = {
      css: props.customCss,
      cssTemplates: [],
      showReportSubMenu: null,
    };

    this.changeCss = this.changeCss.bind(this);
    this.changeRefreshInterval = this.changeRefreshInterval.bind(this);
    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.setShowReportSubMenu = this.setShowReportSubMenu.bind(this);
  }

  UNSAFE_componentWillMount() {
    SupersetClient.get({ endpoint: '/csstemplateasyncmodelview/api/read' })
      .then(({ json }) => {
        const cssTemplates = json.result.map(row => ({
          value: row.template_name,
          css: row.css,
          label: row.template_name,
        }));
        this.setState({ cssTemplates });
      })
      .catch(() => {
        this.props.addDangerToast(
          t('An error occurred while fetching available CSS templates'),
        );
      });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.customCss !== nextProps.customCss) {
      this.setState({ css: nextProps.customCss }, () => {
        injectCustomCss(nextProps.customCss);
      });
    }
  }

  setShowReportSubMenu(show) {
    this.setState({
      showReportSubMenu: show,
    });
  }

  changeCss(css) {
    this.props.onChange();
    this.props.updateCss(css);
  }

  changeRefreshInterval(refreshInterval, isPersistent) {
    this.props.setRefreshFrequency(refreshInterval, isPersistent);
    this.props.startPeriodicRender(refreshInterval * 1000);
  }

  handleMenuClick({ key, domEvent }) {
    switch (key) {
      case MENU_KEYS.REFRESH_DASHBOARD:
        this.props.forceRefreshAllCharts();
        this.props.addSuccessToast(t('Refreshing charts'));
        break;
      case MENU_KEYS.EDIT_PROPERTIES:
        this.props.showPropertiesModal();
        break;
      case MENU_KEYS.DOWNLOAD_AS_IMAGE: {
        // menu closes with a delay, we need to hide it manually,
        // so that we don't capture it on the screenshot
        const menu = document.querySelector(
          '.ant-dropdown:not(.ant-dropdown-hidden)',
        );
        menu.style.visibility = 'hidden';
        downloadAsImage(
          SCREENSHOT_NODE_SELECTOR,
          this.props.dashboardTitle,
          true,
        )(domEvent).then(() => {
          menu.style.visibility = 'visible';
        });
        this.props.logEvent?.(LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_IMAGE);
        break;
      }
      case MENU_KEYS.TOGGLE_FULLSCREEN: {
        const url = getDashboardUrl({
          pathname: window.location.pathname,
          filters: getActiveFilters(),
          hash: window.location.hash,
          standalone: !getUrlParam(URL_PARAMS.standalone),
        });
        window.location.replace(url);
        break;
      }
      case MENU_KEYS.MANAGE_EMBEDDED: {
        this.props.manageEmbedded();
        break;
      }
      default:
        break;
    }
  }

  render() {
    const {
      dashboardTitle,
      dashboardId,
      dashboardInfo,
      refreshFrequency,
      shouldPersistRefreshFrequency,
      editMode,
      customCss,
      colorNamespace,
      colorScheme,
      layout,
      expandedSlices,
      onSave,
      userCanEdit,
      userCanShare,
      userCanSave,
      userCanCurate,
      isLoading,
      refreshLimit,
      refreshWarning,
      lastModifiedTime,
      addSuccessToast,
      addDangerToast,
      setIsDropdownVisible,
      isDropdownVisible,
      ...rest
    } = this.props;

    const emailTitle = t('Superset dashboard');
    const emailSubject = `${emailTitle} ${dashboardTitle}`;
    const emailBody = t('Check out this dashboard: ');

    const url = getDashboardUrl({
      pathname: window.location.pathname,
      filters: getActiveFilters(),
      hash: window.location.hash,
    });

    const refreshIntervalOptions =
      dashboardInfo.common?.conf?.DASHBOARD_AUTO_REFRESH_INTERVALS;

    return (
      <Menu selectable={false} data-test="header-actions-menu" {...rest}>
        {!editMode && (
          <Menu.Item
            key={MENU_KEYS.REFRESH_DASHBOARD}
            data-test="refresh-dashboard-menu-item"
            disabled={isLoading}
            onClick={this.handleMenuClick}
          >
            {t('Refresh dashboard')}
          </Menu.Item>
        )}
        {!editMode && (
          <Menu.Item
            key={MENU_KEYS.TOGGLE_FULLSCREEN}
            onClick={this.handleMenuClick}
          >
            {getUrlParam(URL_PARAMS.standalone)
              ? t('Exit fullscreen')
              : t('Enter fullscreen')}
          </Menu.Item>
        )}
        {editMode && (
          <Menu.Item
            key={MENU_KEYS.EDIT_PROPERTIES}
            onClick={this.handleMenuClick}
          >
            {t('Edit properties')}
          </Menu.Item>
        )}
        {editMode && (
          <Menu.Item key={MENU_KEYS.EDIT_CSS}>
            <CssEditor
              triggerNode={<span>{t('Edit CSS')}</span>}
              initialCss={this.state.css}
              templates={this.state.cssTemplates}
              onChange={this.changeCss}
            />
          </Menu.Item>
        )}
        <Menu.Divider />
        {userCanSave && (
          <Menu.Item key={MENU_KEYS.SAVE_MODAL}>
            <SaveModal
              addSuccessToast={this.props.addSuccessToast}
              addDangerToast={this.props.addDangerToast}
              dashboardId={dashboardId}
              dashboardTitle={dashboardTitle}
              dashboardInfo={dashboardInfo}
              saveType={SAVE_TYPE_NEWDASHBOARD}
              layout={layout}
              expandedSlices={expandedSlices}
              refreshFrequency={refreshFrequency}
              shouldPersistRefreshFrequency={shouldPersistRefreshFrequency}
              lastModifiedTime={lastModifiedTime}
              customCss={customCss}
              colorNamespace={colorNamespace}
              colorScheme={colorScheme}
              onSave={onSave}
              triggerNode={
                <span data-test="save-as-menu-item">{t('Save as')}</span>
              }
              canOverwrite={userCanEdit}
            />
          </Menu.Item>
        )}
        {!editMode && (
          <Menu.Item
            key={MENU_KEYS.DOWNLOAD_AS_IMAGE}
            onClick={this.handleMenuClick}
          >
            {t('Download as image')}
          </Menu.Item>
        )}
        {userCanShare && (
          <Menu.SubMenu
            key={MENU_KEYS.SHARE_DASHBOARD}
            data-test="share-dashboard-menu-item"
            disabled={isLoading}
            title={t('Share')}
          >
            <ShareMenuItems
              url={url}
              copyMenuItemTitle={t('Copy permalink to clipboard')}
              emailMenuItemTitle={t('Share permalink by email')}
              emailSubject={emailSubject}
              emailBody={emailBody}
              addSuccessToast={addSuccessToast}
              addDangerToast={addDangerToast}
              dashboardId={dashboardId}
            />
          </Menu.SubMenu>
        )}
        {!editMode && userCanCurate && (
          <Menu.Item
            key={MENU_KEYS.MANAGE_EMBEDDED}
            onClick={this.handleMenuClick}
          >
            {t('Embed dashboard')}
          </Menu.Item>
        )}
        <Menu.Divider />
        {!editMode ? (
          this.state.showReportSubMenu ? (
            <>
              <Menu.SubMenu title={t('Manage email report')}>
                <HeaderReportDropdown
                  dashboardId={dashboardInfo.id}
                  setShowReportSubMenu={this.setShowReportSubMenu}
                  showReportSubMenu={this.state.showReportSubMenu}
                  setIsDropdownVisible={setIsDropdownVisible}
                  isDropdownVisible={isDropdownVisible}
                  useTextMenu
                />
              </Menu.SubMenu>
              <Menu.Divider />
            </>
          ) : (
            <Menu>
              <HeaderReportDropdown
                dashboardId={dashboardInfo.id}
                setShowReportSubMenu={this.setShowReportSubMenu}
                setIsDropdownVisible={setIsDropdownVisible}
                isDropdownVisible={isDropdownVisible}
                useTextMenu
              />
            </Menu>
          )
        ) : null}
        {editMode &&
          !(
            isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS) &&
            isEmpty(dashboardInfo?.metadata?.filter_scopes)
          ) && (
            <Menu.Item key={MENU_KEYS.SET_FILTER_MAPPING}>
              <FilterScopeModal
                className="m-r-5"
                triggerNode={t('Set filter mapping')}
              />
            </Menu.Item>
          )}

        <Menu.Item key={MENU_KEYS.AUTOREFRESH_MODAL}>
          <RefreshIntervalModal
            addSuccessToast={this.props.addSuccessToast}
            refreshFrequency={refreshFrequency}
            refreshLimit={refreshLimit}
            refreshWarning={refreshWarning}
            onChange={this.changeRefreshInterval}
            editMode={editMode}
            refreshIntervalOptions={refreshIntervalOptions}
            triggerNode={<span>{t('Set auto-refresh interval')}</span>}
          />
        </Menu.Item>
      </Menu>
    );
  }
}


