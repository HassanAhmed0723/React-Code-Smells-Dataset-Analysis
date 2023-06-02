class SaveModal extends React.PureComponent<SaveModalProps, SaveModalState> {
  static defaultProps = defaultProps;

  modal: ModalTriggerRef | null;

  onSave: (
    data: Record<string, any>,
    dashboardId: number | string,
    saveType: SaveType,
  ) => Promise<JsonResponse>;

  constructor(props: SaveModalProps) {
    super(props);
    this.state = {
      saveType: props.saveType,
      newDashName: props.dashboardTitle + t('[copy]'),
      duplicateSlices: false,
    };

    this.handleSaveTypeChange = this.handleSaveTypeChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.saveDashboard = this.saveDashboard.bind(this);
    this.toggleDuplicateSlices = this.toggleDuplicateSlices.bind(this);
    this.onSave = this.props.onSave.bind(this);
    this.modal = React.createRef() as ModalTriggerRef;
  }

  toggleDuplicateSlices(): void {
    this.setState(prevState => ({
      duplicateSlices: !prevState.duplicateSlices,
    }));
  }

  handleSaveTypeChange(event: RadioChangeEvent) {
    this.setState({
      saveType: (event.target as HTMLInputElement).value as SaveType,
    });
  }

  handleNameChange(name: string) {
    this.setState({
      newDashName: name,
      saveType: SAVE_TYPE_NEWDASHBOARD,
    });
  }

  saveDashboard() {
    const { saveType, newDashName } = this.state;
    const {
      dashboardTitle,
      dashboardInfo,
      layout: positions,
      customCss,
      dashboardId,
      refreshFrequency: currentRefreshFrequency,
      shouldPersistRefreshFrequency,
      lastModifiedTime,
    } = this.props;

    // check refresh frequency is for current session or persist
    const refreshFrequency = shouldPersistRefreshFrequency
      ? currentRefreshFrequency
      : dashboardInfo.metadata?.refresh_frequency; // eslint-disable camelcase

    const data = {
      certified_by: dashboardInfo.certified_by,
      certification_details: dashboardInfo.certification_details,
      css: customCss,
      dashboard_title:
        saveType === SAVE_TYPE_NEWDASHBOARD ? newDashName : dashboardTitle,
      duplicate_slices: this.state.duplicateSlices,
      last_modified_time: lastModifiedTime,
      owners: dashboardInfo.owners,
      roles: dashboardInfo.roles,
      metadata: {
        ...dashboardInfo?.metadata,
        positions,
        refresh_frequency: refreshFrequency,
      },
    };

    if (saveType === SAVE_TYPE_NEWDASHBOARD && !newDashName) {
      this.props.addDangerToast(
        t('You must pick a name for the new dashboard'),
      );
    } else {
      this.onSave(data, dashboardId, saveType).then((resp: JsonResponse) => {
        if (saveType === SAVE_TYPE_NEWDASHBOARD && resp.json?.result?.id) {
          window.location.href = `/superset/dashboard/${resp.json.result.id}/`;
        }
      });
      this.modal?.current?.close?.();
    }
  }

  render() {
    return (
      <ModalTrigger
        ref={this.modal}
        triggerNode={this.props.triggerNode}
        modalTitle={t('Save dashboard')}
        modalBody={
          <div>
            <Radio
              value={SAVE_TYPE_OVERWRITE}
              onChange={this.handleSaveTypeChange}
              checked={this.state.saveType === SAVE_TYPE_OVERWRITE}
              disabled={!this.props.canOverwrite}
            >
              {t('Overwrite Dashboard [%s]', this.props.dashboardTitle)}
            </Radio>
            <hr />
            <Radio
              value={SAVE_TYPE_NEWDASHBOARD}
              onChange={this.handleSaveTypeChange}
              checked={this.state.saveType === SAVE_TYPE_NEWDASHBOARD}
            >
              {t('Save as:')}
            </Radio>
            <Input
              type="text"
              placeholder={t('[dashboard name]')}
              value={this.state.newDashName}
              onFocus={e => this.handleNameChange(e.target.value)}
              onChange={e => this.handleNameChange(e.target.value)}
            />
            <div className="m-l-25 m-t-5">
              <Checkbox
                checked={this.state.duplicateSlices}
                onChange={() => this.toggleDuplicateSlices()}
              />
              <span className="m-l-5">{t('also copy (duplicate) charts')}</span>
            </div>
          </div>
        }
        modalFooter={
          <div>
            <Button
              data-test="modal-save-dashboard-button"
              buttonStyle="primary"
              onClick={this.saveDashboard}
            >
              {t('Save')}
            </Button>
          </div>
        }
      />
    );
  }
}
