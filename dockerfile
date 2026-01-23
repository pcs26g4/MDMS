FROM python:3.10-slim

WORKDIR /app

COPY mdms/Backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY mdms/ ./mdms

EXPOSE 8000

CMD ["python", "mdms/Backend/app.py"]