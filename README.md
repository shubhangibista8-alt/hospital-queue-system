
  # Hospital Token Management System

  This is a code bundle for Hospital Token Management System. The original project is available at https://www.figma.com/design/LbQaTdxKQWxKWub7mRubwu/Hospital-Token-Management-System.

  ## Running the code

  Run `npm i` to install the dependencies.

Start the backend API in a separate terminal:

```bash
python -m uvicorn record_store:app --reload --port 8000
```

Start the frontend:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to the Python backend.
  