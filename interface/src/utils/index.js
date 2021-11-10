export const isTestNetEnv = () => {
  if (typeof window !== `undefined`) {
    return (
      process.env.REACT_APP_TestNet === "true" ||
      window.location.hostname.includes("test")
    );
  }
  return false;
};
