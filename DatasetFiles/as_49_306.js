class CollectionControl extends React.Component {
  constructor(props) {
    super(props);
    this.onAdd = this.onAdd.bind(this);
  }

  onChange(i, value) {
    const newValue = [...this.props.value];
    newValue[i] = { ...this.props.value[i], ...value };
    this.props.onChange(newValue);
  }

  onAdd() {
    this.props.onChange(this.props.value.concat([this.props.itemGenerator()]));
  }

  onSortEnd({ oldIndex, newIndex }) {
    this.props.onChange(arrayMove(this.props.value, oldIndex, newIndex));
  }

  removeItem(i) {
    this.props.onChange(this.props.value.filter((o, ix) => i !== ix));
  }

  renderList() {
    if (this.props.value.length === 0) {
      return <div className="text-muted">{this.props.placeholder}</div>;
    }
    const Control = controlMap[this.props.controlName];
    return (
      <SortableList
        useDragHandle
        lockAxis="y"
        onSortEnd={this.onSortEnd.bind(this)}
        bordered
        css={theme => ({
          borderRadius: theme.gridUnit,
        })}
      >
        {this.props.value.map((o, i) => {
          // label relevant only for header, not here
          const { label, ...commonProps } = this.props;
          return (
            <SortableListItem
              className="clearfix"
              css={{ justifyContent: 'flex-start' }}
              key={this.props.keyAccessor(o)}
              index={i}
            >
              <SortableDragger />
              <div
                css={theme => ({
                  flex: 1,
                  marginLeft: theme.gridUnit * 2,
                  marginRight: theme.gridUnit * 2,
                })}
              >
                <Control
                  {...commonProps}
                  {...o}
                  onChange={this.onChange.bind(this, i)}
                />
              </div>
              <InfoTooltipWithTrigger
                icon="times"
                label="remove-item"
                tooltip={t('Remove item')}
                bsStyle="primary"
                onClick={this.removeItem.bind(this, i)}
              />
            </SortableListItem>
          );
        })}
      </SortableList>
    );
  }

  render() {
    const { theme } = this.props;
    return (
      <div data-test="CollectionControl" className="CollectionControl">
        <HeaderContainer>
          <ControlHeader {...this.props} />
          <AddIconButton onClick={this.onAdd}>
            <Icons.PlusLarge
              iconSize="s"
              iconColor={theme.colors.grayscale.light5}
            />
          </AddIconButton>
        </HeaderContainer>
        {this.renderList()}
      </div>
    );
  }
}


