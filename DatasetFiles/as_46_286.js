class SliceAdder extends React.Component {
  static sortByComparator(attr) {
    const desc = attr === 'changed_on' ? -1 : 1;

    return (a, b) => {
      if (a[attr] < b[attr]) {
        return -1 * desc;
      }
      if (a[attr] > b[attr]) {
        return 1 * desc;
      }
      return 0;
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      filteredSlices: [],
      searchTerm: '',
      sortBy: DEFAULT_SORT_KEY,
      selectedSliceIdsSet: new Set(props.selectedSliceIds),
      showOnlyMyCharts: getItem(
        LocalStorageKeys.dashboard__editor_show_only_my_charts,
        true,
      ),
    };
    this.rowRenderer = this.rowRenderer.bind(this);
    this.searchUpdated = this.searchUpdated.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.userIdForFetch = this.userIdForFetch.bind(this);
    this.onShowOnlyMyCharts = this.onShowOnlyMyCharts.bind(this);
  }

  userIdForFetch() {
    return this.state.showOnlyMyCharts ? this.props.userId : undefined;
  }

  componentDidMount() {
    this.slicesRequest = this.props.fetchSlices(this.userIdForFetch());
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const nextState = {};
    if (nextProps.lastUpdated !== this.props.lastUpdated) {
      nextState.filteredSlices = this.getFilteredSortedSlices(
        nextProps.slices,
        this.state.searchTerm,
        this.state.sortBy,
        this.state.showOnlyMyCharts,
      );
    }

    if (nextProps.selectedSliceIds !== this.props.selectedSliceIds) {
      nextState.selectedSliceIdsSet = new Set(nextProps.selectedSliceIds);
    }

    if (Object.keys(nextState).length) {
      this.setState(nextState);
    }
  }

  componentWillUnmount() {
    // Clears the redux store keeping only selected items
    const selectedSlices = pickBy(this.props.slices, value =>
      this.state.selectedSliceIdsSet.has(value.slice_id),
    );
    this.props.updateSlices(selectedSlices);
    if (this.slicesRequest && this.slicesRequest.abort) {
      this.slicesRequest.abort();
    }
  }

  getFilteredSortedSlices(slices, searchTerm, sortBy, showOnlyMyCharts) {
    return Object.values(slices)
      .filter(slice =>
        showOnlyMyCharts
          ? (slice.owners &&
              slice.owners.find(owner => owner.id === this.props.userId)) ||
            (slice.created_by && slice.created_by.id === this.props.userId)
          : true,
      )
      .filter(createFilter(searchTerm, KEYS_TO_FILTERS))
      .sort(SliceAdder.sortByComparator(sortBy));
  }

  handleChange = debounce(value => {
    this.searchUpdated(value);
    this.slicesRequest = this.props.fetchSlices(
      this.userIdForFetch(),
      value,
      this.state.sortBy,
    );
  }, 300);

  searchUpdated(searchTerm) {
    this.setState(prevState => ({
      searchTerm,
      filteredSlices: this.getFilteredSortedSlices(
        this.props.slices,
        searchTerm,
        prevState.sortBy,
        prevState.showOnlyMyCharts,
      ),
    }));
  }

  handleSelect(sortBy) {
    this.setState(prevState => ({
      sortBy,
      filteredSlices: this.getFilteredSortedSlices(
        this.props.slices,
        prevState.searchTerm,
        sortBy,
        prevState.showOnlyMyCharts,
      ),
    }));
    this.slicesRequest = this.props.fetchSlices(
      this.userIdForFetch(),
      this.state.searchTerm,
      sortBy,
    );
  }

  rowRenderer({ key, index, style }) {
    const { filteredSlices, selectedSliceIdsSet } = this.state;
    const cellData = filteredSlices[index];
    const isSelected = selectedSliceIdsSet.has(cellData.slice_id);
    const type = CHART_TYPE;
    const id = NEW_CHART_ID;

    const meta = {
      chartId: cellData.slice_id,
      sliceName: cellData.slice_name,
    };
    return (
      <DragDroppable
        key={key}
        component={{ type, id, meta }}
        parentComponent={{
          id: NEW_COMPONENTS_SOURCE_ID,
          type: NEW_COMPONENT_SOURCE_TYPE,
        }}
        index={index}
        depth={0}
        disableDragDrop={isSelected}
        editMode={this.props.editMode}
        // we must use a custom drag preview within the List because
        // it does not seem to work within a fixed-position container
        useEmptyDragPreview
        // List library expect style props here
        // actual style should be applied to nested AddSliceCard component
        style={{}}
      >
        {({ dragSourceRef }) => (
          <AddSliceCard
            innerRef={dragSourceRef}
            style={style}
            sliceName={cellData.slice_name}
            lastModified={cellData.changed_on_humanized}
            visType={cellData.viz_type}
            datasourceUrl={cellData.datasource_url}
            datasourceName={cellData.datasource_name}
            thumbnailUrl={cellData.thumbnail_url}
            isSelected={isSelected}
          />
        )}
      </DragDroppable>
    );
  }

  onShowOnlyMyCharts(showOnlyMyCharts) {
    if (!showOnlyMyCharts) {
      this.slicesRequest = this.props.fetchSlices(
        undefined,
        this.state.searchTerm,
        this.state.sortBy,
      );
    }
    this.setState(prevState => ({
      showOnlyMyCharts,
      filteredSlices: this.getFilteredSortedSlices(
        this.props.slices,
        prevState.searchTerm,
        prevState.sortBy,
        showOnlyMyCharts,
      ),
    }));
    setItem(
      LocalStorageKeys.dashboard__editor_show_only_my_charts,
      showOnlyMyCharts,
    );
  }

  render() {
    return (
      <div
        css={css`
          height: 100%;
          display: flex;
          flex-direction: column;
        `}
      >
        <NewChartButtonContainer>
          <NewChartButton
            buttonStyle="link"
            buttonSize="xsmall"
            onClick={() =>
              window.open(
                `/chart/add?dashboard_id=${this.props.dashboardId}`,
                '_blank',
                'noopener noreferrer',
              )
            }
          >
            <Icons.PlusSmall />
            {t('Create new chart')}
          </NewChartButton>
        </NewChartButtonContainer>
        <Controls>
          <Input
            placeholder={
              this.state.showOnlyMyCharts
                ? t('Filter your charts')
                : t('Filter charts')
            }
            className="search-input"
            onChange={ev => this.handleChange(ev.target.value)}
            data-test="dashboard-charts-filter-search-input"
          />
          <StyledSelect
            id="slice-adder-sortby"
            value={this.state.sortBy}
            onChange={this.handleSelect}
            options={Object.entries(KEYS_TO_SORT).map(([key, label]) => ({
              label: t('Sort by %s', label),
              value: key,
            }))}
            placeholder={t('Sort by')}
          />
        </Controls>
        <div
          css={theme => css`
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
            gap: ${theme.gridUnit}px;
            padding: 0 ${theme.gridUnit * 3}px ${theme.gridUnit * 4}px
              ${theme.gridUnit * 3}px;
          `}
        >
          <Checkbox
            onChange={this.onShowOnlyMyCharts}
            checked={this.state.showOnlyMyCharts}
          />
          {t('Show only my charts')}
          <InfoTooltipWithTrigger
            placement="top"
            tooltip={t(
              `You can choose to display all charts that you have access to or only the ones you own.
              Your filter selection will be saved and remain active until you choose to change it.`,
            )}
          />
        </div>
        {this.props.isLoading && <Loading />}
        {!this.props.isLoading && this.state.filteredSlices.length > 0 && (
          <ChartList>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  width={width}
                  height={height}
                  itemCount={this.state.filteredSlices.length}
                  itemSize={DEFAULT_CELL_HEIGHT}
                  searchTerm={this.state.searchTerm}
                  sortBy={this.state.sortBy}
                  selectedSliceIds={this.props.selectedSliceIds}
                >
                  {this.rowRenderer}
                </List>
              )}
            </AutoSizer>
          </ChartList>
        )}
        {this.props.errorMessage && (
          <div
            css={css`
              padding: 16px;
            `}
          >
            {this.props.errorMessage}
          </div>
        )}
        {/* Drag preview is just a single fixed-position element */}
        <AddSliceDragPreview slices={this.state.filteredSlices} />
      </div>
    );
  }
}


