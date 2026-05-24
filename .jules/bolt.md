
## 2024-11-20 - [React Flow State Optimization Type Safety]
**Learning:** When using functional setters (`setEdges`) to selectively mutate edge properties for performance, TypeScript will throw TS2345 (assignability error) if custom data fields retrieved from `edge.data` (like `edge.data?.originalLabel`) are not explicitly cast. It infers `unknown` instead of the expected `string | undefined` or `ReactNode`.
**Action:** Always explicitly cast custom data properties (e.g., `edge.data?.originalLabel as string | undefined`) when referencing them inside functional state updates in React Flow to satisfy strict typing.
