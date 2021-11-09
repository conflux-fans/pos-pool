import { Table, Tag, Space } from "antd";
import { RightCircleOutlined } from "@ant-design/icons";

function Home() {
  const columns = [
    {
      title: "Pool",
      dataIndex: "name",
      key: "name",
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Total Locked",
      dataIndex: "age",
      key: "age",
    },
    {
      title: "APY",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Performance Fee",
      dataIndex: "fee",
      key: "fee",
    },
    {
      title: "Tags",
      key: "tags",
      dataIndex: "tags",
      render: (tags) => (
        <>
          {tags.map((tag) => {
            let color = tag.length > 5 ? "geekblue" : "green";
            if (tag === "loser") {
              color = "volcano";
            }
            return (
              <Tag color={color} key={tag}>
                {tag.toUpperCase()}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: "",
      key: "action",
      render: (text, record) => (
        <Space size="middle">
          <RightCircleOutlined onClick={goDetails} style={{ fontSize: '28px', color: '#08c' }} />
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: "1",
      name: "John Brown",
      age: 32,
      fee: 10,
      address: "New York No. 1 Lake Park",
      tags: ["nice", "developer"],
    },
    {
      key: "2",
      name: "Jim Green",
      age: 42,
      fee: 10,
      address: "London No. 1 Lake Park",
      tags: ["loser"],
    },
    {
      key: "3",
      name: "Joe Black",
      age: 32,
      fee: 10,
      address: "Sidney No. 1 Lake Park",
      tags: ["cool", "teacher"],
    },
    {
      key: "1",
      name: "John Brown",
      age: 32,
      fee: 10,
      address: "New York No. 1 Lake Park",
      tags: ["nice", "developer"],
    },
    {
      key: "2",
      name: "Jim Green",
      age: 42,
      fee: 10,
      address: "London No. 1 Lake Park",
      tags: ["loser"],
    },
    {
      key: "3",
      name: "Joe Black",
      age: 32,
      fee: 10,
      address: "Sidney No. 1 Lake Park",
      tags: ["cool", "teacher"],
    },
    {
      key: "1",
      name: "John Brown",
      age: 32,
      fee: 10,
      address: "New York No. 1 Lake Park",
      tags: ["nice", "developer"],
    },
    {
      key: "2",
      name: "Jim Green",
      age: 42,
      fee: 10,
      address: "London No. 1 Lake Park",
      tags: ["loser"],
    },
    {
      key: "3",
      name: "Joe Black",
      age: 32,
      fee: 10,
      address: "Sidney No. 1 Lake Park",
      tags: ["cool", "teacher"],
    },
  ];
  const goDetails = () => {};

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Table columns={columns} dataSource={data} pagination={false} />
    </div>
  );
}

export default Home;
