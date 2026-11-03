import React, { useState } from "react";
import { TestMenu } from "./TestMenu";
import { TestPageOne } from "./TestPageOne";
import { TestPageTwo } from "./TestPageTwo";
import { TestPageThree } from "./TestPageThree";

export type TestSubPage = "menu" | "test-page-1" | "test-page-2" | "test-page-3";

export const TestViewsContainer: React.FC = () => {
  const [currentSubPage, setCurrentSubPage] = useState<TestSubPage>("menu");

  if (currentSubPage === "test-page-1") {
    return (
      <TestPageOne
        onBackToMenu={() => setCurrentSubPage("menu")}
        onSwitchPage={(pageId) => setCurrentSubPage(pageId)}
      />
    );
  }

  if (currentSubPage === "test-page-2") {
    return (
      <TestPageTwo
        onBackToMenu={() => setCurrentSubPage("menu")}
        onSwitchPage={(pageId) => setCurrentSubPage(pageId)}
      />
    );
  }

  if (currentSubPage === "test-page-3") {
    return (
      <TestPageThree
        onBackToMenu={() => setCurrentSubPage("menu")}
        onSwitchPage={(pageId) => setCurrentSubPage(pageId)}
      />
    );
  }

  return (
    <TestMenu
      onSelectPage={(pageId) => setCurrentSubPage(pageId)}
    />
  );
};
