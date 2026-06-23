## 2024-05-20 - React Flow Node State Functional Setter
**Learning:** Using React Flow, explicitly recreating element arrays completely drops internal React Flow states and positions for elements that don't pass explicit positions down, requiring brittle ref-based position tracking manually.
**Action:** Always use functional setters mapping over existing node array state to update dynamic visibility props (like CSS opacity and pointerEvents), spreading the rest of the node properties instead of recalculating nodes from scratch using a helper.
