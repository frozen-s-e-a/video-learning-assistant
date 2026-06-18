import base64

from app.services.analyzer import MAX_BASE64_CHARS, MAX_IMAGE_BYTES


def auth_headers():
    return {"Authorization": "Bearer test-token"}


def tiny_jpeg_base64():
    return base64.b64encode(
        bytes.fromhex(
            "ffd8ffe000104a46494600010101006000600000ffdb004300"
            "0302020302020303030304030304050805050404050a07070608"
            "0c0a0c0c0b0a0b0b0d0e12100d0e110e0b0b1016101113141515"
            "1515150c0f171816141812141514ffdb00430103040405040509"
            "050509140d0b0d14141414141414141414141414141414141414"
            "1414141414141414141414141414141414141414141414141414"
            "1414141414ffc00011080001000103012200021101031101ffc4"
            "001f000001050101010101010000000000000000010203040506"
            "0708090a0bffc400b5100002010303020403050504040000017d"
            "01020300041105122131410613516107227114328191a1082342"
            "b1c11552d1f02433627282090a161718191a25262728292a3435"
            "363738393a434445464748494a535455565758595a6364656667"
            "68696a737475767778797a838485868788898a92939495969798"
            "999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6"
            "c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2"
            "f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000"
            "000000000102030405060708090a0bffc400b511000201020404"
            "0304070504040001027700010203110405213106124151076171"
            "132232810814291a1b1c109233352f0156272d10a162434e125"
            "f11718191a262728292a35363738393a434445464748494a5354"
            "55565758595a636465666768696a737475767778797a82838485"
            "868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4"
            "b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2"
            "e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002"
            "110311003f00f7fa28a2803fffd90"
        )
    ).decode("ascii")


def analyze_payload(provider="fake", model="fake-vision"):
    return {
        "provider": provider,
        "model": model,
        "taskType": "auto",
        "image": {"mimeType": "image/jpeg", "data": tiny_jpeg_base64()},
        "selection": None,
        "subtitle": {"current": "This function fetches data.", "nearby": []},
        "videoContext": {
            "site": "bilibili",
            "title": "Async tutorial",
            "url": "https://www.bilibili.com/video/BV1",
            "timeSeconds": 42,
        },
        "question": "Explain this frame",
    }


def test_analyze_frame_with_fake_provider(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["detectedType"] == "code"
    assert body["mode"] == "vision"
    assert body["answer"]["title"] == "Fake analysis"
    assert body["suggestedQuestions"] == ["Why is async used here?"]


def test_unknown_provider_returns_model_not_configured(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(provider="missing", model="x"),
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MODEL_NOT_CONFIGURED"


def test_unknown_model_returns_model_not_configured(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(model="missing"),
    )

    assert response.status_code == 400
    assert response.json()["error"] == {
        "code": "MODEL_NOT_CONFIGURED",
        "message": "Selected model is not configured",
    }


def test_fake_text_model_routes_to_ocr(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(model="fake-text"),
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OCR_NOT_CONFIGURED"


def test_analyze_frame_rejects_invalid_base64(client):
    payload = analyze_payload()
    payload["image"]["data"] = "not valid base64"

    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=payload,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_analyze_frame_rejects_oversized_base64_before_decoding(client):
    payload = analyze_payload()
    payload["image"]["data"] = "A" * (MAX_BASE64_CHARS + 1)

    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=payload,
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"


def test_analyze_frame_rejects_oversized_decoded_image(client):
    payload = analyze_payload()
    payload["image"]["data"] = base64.b64encode(b"\0" * (MAX_IMAGE_BYTES + 1)).decode(
        "ascii"
    )

    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=payload,
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"
