pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  triggers {
    // Local Jenkins can't receive GitHub webhooks easily; polling is fine for now.
    pollSCM('H/2 * * * *') // check every ~2 minutes
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Build & Test') {
      steps {
        dir('app') {
          sh 'npm ci || npm install'
          sh 'npm test'
        }
      }
    }
  }

  post {
    always {
      echo "Build finished."
    }
  }
}
