import { useState } from "react";

interface Props {
  items: string[];
  heading: string;
  onSelectItem: (item: string) => void;
}

function ButtonGroup({ items, heading, onSelectItem }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <div className="buttonGroup">
      <h1 className="heading">{heading}</h1>
      {items.length === 0 && <p>No item found</p>}
      <div className="btn-group-vertical">
        {items.map((item, index) => (
          <button
            className={"btn-inapoi-imp"}
            key={item}
            onClick={() => {
              setSelectedIndex(index);
              onSelectItem(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ButtonGroup;
