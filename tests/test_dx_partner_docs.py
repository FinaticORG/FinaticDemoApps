from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = (
    "createPortalLink",
    "create_portal_link",
    "/api/v1/sessions",
    "portal-links",
)


def test_demo_sources_use_published_v1() -> None:
    paths = [
        ROOT / "README.md",
        ROOT / "server-node/demo-app/src/index.ts",
        ROOT / "server-python/demo-app/demo_cli.py",
        ROOT / "client/demo-app/src/sdk.ts",
    ]
    for path in paths:
        text = path.read_text(encoding="utf-8")
        for snippet in FORBIDDEN:
            assert snippet not in text, f"{path} still references {snippet}"


def test_demo_readme_points_at_sdk_readmes_and_agent_index() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "https://github.com/FinaticORG/FinaticClientSDK/blob/develop/README.md" in readme
    assert "https://github.com/FinaticORG/FinaticServerSDK-Node/blob/develop/README.md" in readme
    assert "https://github.com/FinaticORG/FinaticServerSDK-Python/blob/develop/README.md" in readme
    assert "https://finatic.dev/llms.txt" in readme
    assert "https://finatic.dev/AGENTS.md" in readme
    assert "https://finatic.dev/openapi.json" in readme


def test_client_demo_mints_tokens_on_the_dev_server() -> None:
    sdk_source = (ROOT / "client/demo-app/src/sdk.ts").read_text(encoding="utf-8")
    vite_source = (ROOT / "client/demo-app/vite.config.ts").read_text(
        encoding="utf-8"
    )
    run_guide = (ROOT / "client/demo-app/RUN.md").read_text(encoding="utf-8")
    env_example = (ROOT / "client/demo-app/.env.example").read_text(
        encoding="utf-8"
    )
    app_source = (ROOT / "client/demo-app/src/App.tsx").read_text(encoding="utf-8")

    for source in (sdk_source, vite_source, run_guide, env_example):
        assert "VITE_FINATIC_API_KEY" not in source
    assert "FINATIC_API_KEY" in env_example
    assert "/api/finatic/token" in sdk_source
    assert "FINATIC_API_KEY" in vite_source
    assert "host: '127.0.0.1'" in vite_source
    assert "account.grant.created" in app_source


def test_demo_docs_only_advertise_consumed_environment_variables() -> None:
    paths = [
        ROOT / "README.md",
        ROOT / "client/demo-app/README.md",
        ROOT / "client/demo-app/RUN.md",
        ROOT / "client/demo-app/.env.example",
        ROOT / "server-node/demo-app/.env.example",
        ROOT / "server-python/demo-app/env.example",
    ]
    for path in paths:
        assert "FINATIC_CONNECT_URL" not in path.read_text(encoding="utf-8")
