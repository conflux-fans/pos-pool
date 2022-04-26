import { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Spin, Layout } from "antd";

import "./App.css";
import { Header } from "./pages/components";
import Home from "./pages/Home";
import Pool from "./pages/Pool";

const { Content } = Layout;

function App() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <Spin className="w-20 h-20" />
        </div>
      }
    >
      <Router>
        <Layout className="layout">
          <div className="flex flex-col h-full relative overflow-x-hidden">
            <Header />
            <Content style={{ padding: "50px 50px",backgroundColor:'#2d3344' }}>
              <div>
                <Routes>
                  <Route path="core" element={<Outlet />} >
                    <Route element={<Home />} index />
                    <Route path="pool/:poolAddress" element={<Pool />} />
                  </Route>
                  <Route path="eSpace" element={<Outlet />} >
                    <Route element={<Home />} index />
                    <Route path="pool/:poolAddress" element={<Pool />} />
                  </Route>
                  <Route path="*" element={<Navigate to="core"/>} />
                </Routes>
              </div>
            </Content>
            {/* <Footer style={{ textAlign: 'center' }}>PoS Pool</Footer> */}
          </div>
        </Layout>
      </Router>
    </Suspense>
  );
}

export default App;
