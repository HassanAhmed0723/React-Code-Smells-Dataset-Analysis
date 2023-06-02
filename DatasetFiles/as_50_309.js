class DatasourceControl extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showEditDatasourceModal: false,
      showChangeDatasourceModal: false,
      showSaveDatasetModal: false,
    };
  }

  onDatasourceSave = datasource => {
    this.props.actions.changeDatasource(datasource);
    const { temporalColumns, defaultTemporalColumn } =
      getTemporalColumns(datasource);
    const { columns } = datasource;
    // the current granularity_sqla might not be a temporal column anymore
    const timeCol = this.props.form_data?.granularity_sqla;
    const isGranularitySqalTemporal = columns.find(
      ({ column_name }) => column_name === timeCol,
    )?.is_dttm;
    // the current main_dttm_col might not be a temporal column anymore
    const isDefaultTemporal = columns.find(
      ({ column_name }) => column_name === defaultTemporalColumn,
    )?.is_dttm;

    // if the current granularity_sqla is empty or it is not a temporal column anymore
    // let's update the control value
    if (datasource.type === 'table' && !isGranularitySqalTemporal) {
      const temporalColumn = isDefaultTemporal
        ? defaultTemporalColumn
        : temporalColumns?.[0];
      this.props.actions.setControlValue(
        'granularity_sqla',
        temporalColumn || null,
      );
    }

    if (this.props.onDatasourceSave) {
      this.props.onDatasourceSave(datasource);
    }
  };

  toggleShowDatasource = () => {
    this.setState(({ showDatasource }) => ({
      showDatasource: !showDatasource,
    }));
  };

  toggleChangeDatasourceModal = () => {
    this.setState(({ showChangeDatasourceModal }) => ({
      showChangeDatasourceModal: !showChangeDatasourceModal,
    }));
  };

  toggleEditDatasourceModal = () => {
    this.setState(({ showEditDatasourceModal }) => ({
      showEditDatasourceModal: !showEditDatasourceModal,
    }));
  };

  toggleSaveDatasetModal = () => {
    this.setState(({ showSaveDatasetModal }) => ({
      showSaveDatasetModal: !showSaveDatasetModal,
    }));
  };

  handleMenuItemClick = ({ key }) => {
    switch (key) {
      case CHANGE_DATASET:
        this.toggleChangeDatasourceModal();
        break;

      case EDIT_DATASET:
        this.toggleEditDatasourceModal();
        break;

      case VIEW_IN_SQL_LAB:
        {
          const { datasource } = this.props;
          const payload = {
            datasourceKey: `${datasource.id}__${datasource.type}`,
            sql: datasource.sql,
          };
          SupersetClient.postForm('/superset/sqllab/', {
            form_data: safeStringify(payload),
          });
        }
        break;

      case SAVE_AS_DATASET:
        this.toggleSaveDatasetModal();
        break;

      default:
        break;
    }
  };

  render() {
    const {
      showChangeDatasourceModal,
      showEditDatasourceModal,
      showSaveDatasetModal,
    } = this.state;
    const { datasource, onChange, theme } = this.props;
    const isMissingDatasource = !datasource?.id;
    let isMissingParams = false;
    if (isMissingDatasource) {
      const datasourceId = getUrlParam(URL_PARAMS.datasourceId);
      const sliceId = getUrlParam(URL_PARAMS.sliceId);

      if (!datasourceId && !sliceId) {
        isMissingParams = true;
      }
    }

    const { user } = this.props;
    const allowEdit =
      datasource.owners?.map(o => o.id || o.value).includes(user.userId) ||
      isUserAdmin(user);

    const canAccessSqlLab = canUserAccessSqlLab(user);

    const editText = t('Edit dataset');

    const defaultDatasourceMenu = (
      <Menu onClick={this.handleMenuItemClick}>
        {this.props.isEditable && !isMissingDatasource && (
          <Menu.Item
            key={EDIT_DATASET}
            data-test="edit-dataset"
            disabled={!allowEdit}
          >
            {!allowEdit ? (
              <Tooltip
                title={t(
                  'You must be a dataset owner in order to edit. Please reach out to a dataset owner to request modifications or edit access.',
                )}
              >
                {editText}
              </Tooltip>
            ) : (
              editText
            )}
          </Menu.Item>
        )}
        <Menu.Item key={CHANGE_DATASET}>{t('Swap dataset')}</Menu.Item>
        {!isMissingDatasource && canAccessSqlLab && (
          <Menu.Item key={VIEW_IN_SQL_LAB}>{t('View in SQL Lab')}</Menu.Item>
        )}
      </Menu>
    );

    const queryDatasourceMenu = (
      <Menu onClick={this.handleMenuItemClick}>
        <Menu.Item key={QUERY_PREVIEW}>
          <ModalTrigger
            triggerNode={
              <span data-test="view-query-menu-item">{t('Query preview')}</span>
            }
            modalTitle={t('Query preview')}
            modalBody={
              <ViewQuery
                sql={datasource?.sql || datasource?.select_star || ''}
              />
            }
            modalFooter={
              <ViewQueryModalFooter
                changeDatasource={this.toggleSaveDatasetModal}
                datasource={datasource}
              />
            }
            draggable={false}
            resizable={false}
            responsive
          />
        </Menu.Item>
        {canAccessSqlLab && (
          <Menu.Item key={VIEW_IN_SQL_LAB}>{t('View in SQL Lab')}</Menu.Item>
        )}
        <Menu.Item key={SAVE_AS_DATASET}>{t('Save as dataset')}</Menu.Item>
      </Menu>
    );

    const { health_check_message: healthCheckMessage } = datasource;

    let extra;
    if (datasource?.extra) {
      if (isString(datasource.extra)) {
        try {
          extra = JSON.parse(datasource.extra);
        } catch {} // eslint-disable-line no-empty
      } else {
        extra = datasource.extra; // eslint-disable-line prefer-destructuring
      }
    }

    const titleText = isMissingDatasource
      ? t('Missing dataset')
      : getDatasourceTitle(datasource);

    const tooltip = titleText;

    return (
      <Styles data-test="datasource-control" className="DatasourceControl">
        <div className="data-container">
          {datasourceIconLookup[datasource?.type]}
          {renderDatasourceTitle(titleText, tooltip)}
          {healthCheckMessage && (
            <Tooltip title={healthCheckMessage}>
              <Icons.AlertSolid iconColor={theme.colors.warning.base} />
            </Tooltip>
          )}
          {extra?.warning_markdown && (
            <WarningIconWithTooltip warningMarkdown={extra.warning_markdown} />
          )}
          <AntdDropdown
            overlay={
              datasource.type === DatasourceType.Query
                ? queryDatasourceMenu
                : defaultDatasourceMenu
            }
            trigger={['click']}
            data-test="datasource-menu"
          >
            <Icons.MoreVert
              className="datasource-modal-trigger"
              data-test="datasource-menu-trigger"
            />
          </AntdDropdown>
        </div>
        {/* missing dataset */}
        {isMissingDatasource && isMissingParams && (
          <div className="error-alert">
            <ErrorAlert
              level="warning"
              title={t('Missing URL parameters')}
              source="explore"
              subtitle={
                <>
                  <p>
                    {t(
                      'The URL is missing the dataset_id or slice_id parameters.',
                    )}
                  </p>
                </>
              }
            />
          </div>
        )}
        {isMissingDatasource && !isMissingParams && (
          <div className="error-alert">
            <ErrorAlert
              level="warning"
              title={t('Missing dataset')}
              source="explore"
              subtitle={
                <>
                  <p>
                    {t(
                      'The dataset linked to this chart may have been deleted.',
                    )}
                  </p>
                  <p>
                    <Button
                      buttonStyle="primary"
                      onClick={() =>
                        this.handleMenuItemClick({ key: CHANGE_DATASET })
                      }
                    >
                      {t('Swap dataset')}
                    </Button>
                  </p>
                </>
              }
            />
          </div>
        )}
        {showEditDatasourceModal && (
          <DatasourceModal
            datasource={datasource}
            show={showEditDatasourceModal}
            onDatasourceSave={this.onDatasourceSave}
            onHide={this.toggleEditDatasourceModal}
          />
        )}
        {showChangeDatasourceModal && (
          <ChangeDatasourceModal
            onDatasourceSave={this.onDatasourceSave}
            onHide={this.toggleChangeDatasourceModal}
            show={showChangeDatasourceModal}
            onChange={onChange}
          />
        )}
        {showSaveDatasetModal && (
          <SaveDatasetModal
            visible={showSaveDatasetModal}
            onHide={this.toggleSaveDatasetModal}
            buttonTextOnSave={t('Save')}
            buttonTextOnOverwrite={t('Overwrite')}
            modalDescription={t(
              'Save this query as a virtual dataset to continue exploring',
            )}
            datasource={getDatasourceAsSaveableDataset(datasource)}
            openWindow={false}
            formData={this.props.form_data}
          />
        )}
      </Styles>
    );
  }
}