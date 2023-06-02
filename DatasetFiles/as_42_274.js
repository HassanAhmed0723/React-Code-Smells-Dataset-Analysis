const FilterTitlePane: React.FC<Props> = ({
  getFilterTitle,
  onChange,
  onAdd,
  onRemove,
  onRearrange,
  restoreFilter,
  currentFilterId,
  filters,
  removedFilters,
  erroredFilters,
}) => {
  const filtersContainerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleOnAdd = (type: NativeFilterType) => {
    onAdd(type);
    setTimeout(() => {
      const element = document.getElementById('native-filters-tabs');
      if (element) {
        const navList = element.getElementsByClassName('ant-tabs-nav-list')[0];
        navList.scrollTop = navList.scrollHeight;
      }

      filtersContainerRef?.current?.scroll?.({
        top: filtersContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };
  const menu = (
    <Menu mode="horizontal">
      {options.map(item => (
        <Menu.Item onClick={() => handleOnAdd(item.type)}>
          {item.label}
        </Menu.Item>
      ))}
    </Menu>
  );
  return (
    <TabsContainer>
      <AntdDropdown
        overlay={menu}
        arrow
        placement="topLeft"
        trigger={['hover']}
      >
        <StyledAddBox>
          <div data-test="new-dropdown-icon" className="fa fa-plus" />{' '}
          <span>{t('Add filters and dividers')}</span>
        </StyledAddBox>
      </AntdDropdown>
      <div
        css={{
          height: '100%',
          overflowY: 'auto',
          marginLeft: theme.gridUnit * 3,
        }}
      >
        <FilterTitleContainer
          ref={filtersContainerRef}
          filters={filters}
          currentFilterId={currentFilterId}
          removedFilters={removedFilters}
          getFilterTitle={getFilterTitle}
          erroredFilters={erroredFilters}
          onChange={onChange}
          onRemove={onRemove}
          onRearrange={onRearrange}
          restoreFilter={restoreFilter}
        />
      </div>
    </TabsContainer>
  );
};


