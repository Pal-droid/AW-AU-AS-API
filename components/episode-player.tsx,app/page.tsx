interface EpisodePlayerProps {
  streamUrl: string | null
}

const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ streamUrl }) => {
  return (
    <div className="episode-player">
      {/* Video block */}
      <video controls>
        <source src="video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Direct stream link */}
      {streamUrl ? (
        <div className="text-sm">
          Link diretto:{" "}
          <a className="underline" href={streamUrl} target="_blank" rel="noreferrer">
            Apri in nuova scheda
          </a>
        </div>
      ) : null}

      {/* Wrapper */}
      <div className="wrapper">{/* Other content */}</div>
    </div>
  )
}

export default EpisodePlayer

// app/page.tsx
import type React from "react"
import TopAnime from "@/components/top-anime"
import { DiscoverSections } from "@/components/discover"

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <TopAnime />
      <DiscoverSections />
      {/* Other content */}
    </div>
  )
}

export default HomePage;
