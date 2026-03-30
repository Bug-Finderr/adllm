# Task Completion Checklist

After completing a coding task:
1. Use serena `get_symbols_overview` to verify new/modified files have correct structure
2. Use serena `find_symbol` / `find_referencing_symbols` to check that changed interfaces are consumed correctly
3. Check for type errors using serena's semantic tools
4. Do NOT run build, lint, or test commands (per CLAUDE.md)
5. Verify imports are correct (especially convex/nextjs vs convex/react)
